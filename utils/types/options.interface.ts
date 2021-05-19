import { OperationOptions } from "retry";
import { ITransactionInfo } from './transaction.interface';

export interface IOptions {
    showLogs?: boolean
    retryOptions?: IRetry,
    autoIdGenerate?: boolean,
    continueOnUndoError?: boolean
}

export interface IRetry extends OperationOptions {
    errorRetryHandler?: ErrorRetryHandler;
}

export type ErrorRetryHandler = (retyNumber: number, transactionsInfo: ITransactionInfo) => void



