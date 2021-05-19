export type ID = string | number

export interface ITransactionObj {
    action: ( transactionsInfo?: ITransactionInfo, actionArgs?: object) => any
    actionArgs?: object,
    undoArgs?: object,
    undo?: (error: Error, transactionsInfo: ITransactionInfo, undoArgs?: object) => any
}

export interface IUserTransactionObj extends ITransactionObj {
    id?: ID,
}

export interface ISystemTransactionObj extends ITransactionObj {
    id: ID,
}

export interface ITransactionInfo {
    transactions: ISystemTransactionObj[],
    currentTransaction: ISystemTransactionObj,
    previousResponses: IResponsesObj,
    previousUndoResponses?: IResponsesObj
}

export interface IResponsesObj {
    [key: string] : object
}

export interface ITransactionResult {
    isSuccess: boolean,
    actionsInfo: {
        responses: IResponsesObj,
        errorInfo?: IFailedActionData
    },
    undoInfo: {
        responses: IResponsesObj,
        errorInfo?: IFailedActionData | IFailedActionData[]
    }
}

export interface IFailedActionData { 
    index: number,
    id: ID,
    error: Error
}
