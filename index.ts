import Transaction from './src/transaction';
import { IOptions, IRetry, ErrorRetryHandler } from './utils/types/options.interface';
import {
    IUserTransactionObj, 
    ISystemTransactionObj,
    ITransactionObj,
    ITransactionInfo, 
    ITransactionResult,
    IResponsesObj,
    IFailedActionData
} from './utils/types/transaction.interface';

export {
    IFailedActionData,
    IResponsesObj,
    ITransactionResult,
    ITransactionInfo,
    IUserTransactionObj,
    ISystemTransactionObj,
    ITransactionObj,
    IOptions,
    IRetry,
    ErrorRetryHandler,
    Transaction
};

export default Transaction;

const main = async () => {
    const transaction = new Transaction({
        retryOptions: {
            retries: 3
        }
    }, [
        {
            id: "0",
            action: (transactionsInfo) => {
                console.log(transactionsInfo?.transactions[0].id);
                return "beni";
            }, 
            undo: () => console.log("undo 1")
        },
        {
            id: "1",
            action: () => console.log("3"),
            undo: () => {throw new Error("super Error")}
        },
        {
            id: "2",
            action: () => { throw new Error("super Error")} 
        }
    ]);
    try {
        const result = await transaction.exec();
        console.log(result)
        
    } catch (error) {
        console.log(error)
    }
}

main();
