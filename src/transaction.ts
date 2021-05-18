import { OperationOptions } from "retry";
import promiseRetry  from 'promise-retry';

import config from '../config/index';
import Logger from "../utils/logger/index";
import { ErrorRetryHandler, IOptions } from '../utils/types/options.interface';
import { 
    ID, 
    ITransactionInfo, 
    IUserTransactionObj, 
    ISystemTransactionObj, 
    IResponsesObj, 
    ITransactionResult,
    IFailedActionData
} from "../utils/types/transaction.interface";

const DEFULT_RETRY_NUMBER = 10;

export default class Transaction {
    retryOptions: OperationOptions
    showLogs: boolean 
    autoIdGenerate: boolean
    errorRetryHandler: ErrorRetryHandler
    continueOnUndoError: boolean

    transactionActions: ISystemTransactionObj[]
    currId: number
    responses: IResponsesObj
    undoResponses: IResponsesObj

    constructor(options: IOptions, actions?: IUserTransactionObj[]) {
        this.showLogs = options?.showLogs || config.showLogs;
        this.autoIdGenerate = options?.autoIdGenerate || config.autoIdGenerate;
        this.continueOnUndoError = options?.continueOnUndoError || config.continueOnUndoError;

        if(options?.retryOptions) {
            this.errorRetryHandler = options?.retryOptions?.errorActionHandler || this.defultErrorRetryHandler;
            delete options.retryOptions.errorActionHandler;
        } else {
            this.errorRetryHandler = this.defultErrorRetryHandler; 
        }
        
        this.retryOptions = options?.retryOptions || config.retryOptions;
        
        this.transactionActions = [];
        this.currId = 0;
        this.responses = {};
        this.undoResponses = {};
        this.appendArray(actions || []);
    }
    
    private createId(action: IUserTransactionObj): ID {
       const { id } = action;

        if(this.autoIdGenerate) {
            this.currId++;

            return this.currId - 1;
        } else if(id){
            return id;
        }

        throw new Error(`Missing id in the action, add id to action or add to options 'autoIdGenerate' flag`);
    }

    isValidAction(action: IUserTransactionObj) : string[] {
        const { id, action: actionCb } = action;
        let erros = [];

        if(!id && !this.autoIdGenerate) erros.push("Missing id, add id to action or add to options 'autoIdGenerate' flag");

        const foundedIdIndex = this.transactionActions.findIndex(currAction => currAction.id === id);

        if(foundedIdIndex !== -1) erros.push(`The id is not unique, found at action number ${foundedIdIndex}`);

        if(!actionCb) erros.push(`Missing action for the '${id}' action`);

        return erros;
    }

    append(action: IUserTransactionObj): void {
        const errorMessages = this.isValidAction(action);

        if(errorMessages.length) throw new Error(errorMessages.join('\n  '));
        
        action.id = this.createId(action);
        this.transactionActions.push(action as ISystemTransactionObj);
    }

    appendArray(actions: IUserTransactionObj[]): void {
        const errors = actions.reduce((errors: string[], currTransaction, i) => {
            try {
                this.append(currTransaction);
            } catch (error) {
                errors.push(`- ${error}\n  (Action in position ${i}).`);
            }

            return errors;
        }, []);
        
        if(errors.length) throw new Error(errors.join('\n'));
    }

    clear() {
        this.currId = 0;
        this.transactionActions = [];
        this.clearResponses();
    }

    private clearResponses() {
        this.responses = {};
        this.undoResponses = {};
    }

    async exec() {
        let failedInfo;
        
        for (let i = 0; i < this.transactionActions.length; i++) {
            const { id, action, actionArgs } = this.transactionActions[i];
            
            try {
                const transactionsInfo: ITransactionInfo = {
                    transactions: this.transactionActions,
                    currentTransaction: this.transactionActions[i],
                    previousResponses: this.responses
                };

                this.responses[id] = await promiseRetry(async (retry, number) => Promise.resolve(action(transactionsInfo, actionArgs)).catch((error: any) => {
                    try {
                        this.errorRetryHandler(number, transactionsInfo);    
                    } catch (error) {
                        Logger.log(this.showLogs, 'Error retry function failed!', config.packageName);
                    }

                    retry(error);
                }), this.retryOptions);
            } catch (error) {
                failedInfo = {
                    index: i,
                    id,
                    error
                } as IFailedActionData;

                break;
            }
        }
        
        const result = {
            isSuccess: true,
            actionsInfo: {
                responses: this.responses,
            }
        } as ITransactionResult;

        if(failedInfo) {
            return await this.failedHandler(failedInfo, result);
        }

        this.clearResponses();

        return result;
    }

    private async failedHandler(failedInfo: IFailedActionData, result: ITransactionResult) {
        const { id } = failedInfo;
        const fullResult = {...result, ...{ isSuccess: false }};

        fullResult.actionsInfo.errorInfo = failedInfo;
            
        Logger.log(this.showLogs, `The execution failed at action '${id}', undo pipeline started`, config.packageName);

        const failedUndoActions = await this.undoActions(failedInfo);
        

        fullResult.undoInfo = {
            responses: this.undoResponses,
        }

        this.clearResponses();
        
        if(failedUndoActions.length) {
            result.undoInfo.errorInfo = this.continueOnUndoError ? failedUndoActions : failedUndoActions[0];
            
            throw result;
        }

        return fullResult;
    }

    remove(id: ID): boolean {
        const index = this.transactionActions.findIndex((action: ISystemTransactionObj) => action.id === id);

        if(index !== -1) {
            this.transactionActions.splice(index, 1);

            return true;
        }

        return false;
    }

    getTransactions(): ISystemTransactionObj[] {
        return this.transactionActions;
    }

    private async undoActions(failedInfo: IFailedActionData) : Promise<IFailedActionData[]> {
        const { index, error } = failedInfo;

        let failedundoActions: IFailedActionData[] = [];

        for(let i = 0; i < index; i++) {
            const { undo, undoArgs, id: currId } = this.transactionActions[i]; 

            const transactionsInfo: ITransactionInfo = {
                transactions: this.transactionActions,
                currentTransaction: this.transactionActions[i],
                previousResponses: this.responses,
                previousUndoResponses: this.undoResponses
            };

            try {
                if(undo) {
                    this.undoResponses[currId] = await promiseRetry(retry => Promise.resolve(undo(error, 
                        transactionsInfo,
                        undoArgs)).catch((error: any) => retry(error)), this.retryOptions);
                }
            } catch (error) {
                failedundoActions.push({
                    id: currId,
                    error,
                    index: i
                });

                if(!this.continueOnUndoError) break;
            }
        }

        return failedundoActions;
    }

    private defultErrorRetryHandler(retyNumber: number, transactionsInfo: ITransactionInfo): void {
        Logger.log(
            this.showLogs, 
            `Attempt number ${retyNumber - 1} from ${this.retryOptions.retries ?? DEFULT_RETRY_NUMBER} ` +
                `for the action: '${transactionsInfo.currentTransaction.id}' failed`, 
            config.packageName
        );
    }
}