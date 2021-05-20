# Welcome to pipe-transaction 👋
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000) [![License: ISC](https://img.shields.io/badge/License-MIT-yellow.svg)](#) 

pipe-transaction is the official library for managing multi-stage operations.

pipe-transaction designed to easly deal with common situation which you are want to perform number of related actions. This process will be considered a success only if **all** the actions performed. 

In another hand, if any process fails along the way - the situation became complicated.in this case you want to be able to return to the initial state as much as another state as a result of the failure. For this purpose excecly pipe-transaction developed.

For example, if you want to update the database through CRUD API, after execute action (such as saving a file), pipe-transaction help you to return to the initial state (delete the file) if the database update failed.

The library is very easy to use and allow wide range of different options. pipe-transaction support async & sync actions at once.

> The official library for managing multi-stage operations.

## Installation

```bash 
$ npm install pipe-transaction
```

## Importing

```javascript
// Using Node.js `require()`
const { Transaction } = require('pipe-transaction');

// Using ES6 imports
import { Transaction } from 'pipe-transaction';
```

## Usage

### new Transaction([options], [actions])

Create a new `Transaction` instance.
`options`(optional) - an object that include the setting of the `Transaction` instance. 
- `showLogs`: Boolean. Allow the library to write errors & information message to the console. Default is `true`.
- `autoIdGenerate`: Boolean. Allow the library to generate automatic number id for the actions, start from `0`. Default is `false`.
- `continueOnUndoError`:  Boolean. When an action failed, Allow the library to continue execute all relevant undo functions, even if an undo function failed. Defult `true`.
- `retryOptions`: An object which maps to the [retry](https://github.com/tim-kos/node-retry) module options:
    - `retries`: Number. The maximum amount of times to retry the operation. Default is `3`.
    - `factor`: Number. The exponential factor to use. Default is `2`.
    - `minTimeout`: Number. The number of milliseconds before starting the first retry. Default is `1000`.
    - `maxTimeout`: Number. The maximum number of milliseconds between two retries. Default is `Infinity`.
    - `randomize`: Boolean. Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `false`.
    - `errorRetryHandler`: Function. Custom callback function that should be called if retry of an action is failed. The `errorRetryHandler` function received two argument: First `retyNumber` - The number of failed retries, start from `0`. Second `transactionsInfo` - Object that describe the transactions statues (see below for `transactionsInfo` structure).

`actions`(optional) - Array of `actions` description (see below for `action` structure).

### exec()

Execute the actions pipeline. Return `result` object (see below for `result` structure) if all the actions success, or if action failed but all the relevant undo actions success. Throw `result` object if an actions failed and at least relevant unto action failed.

## Models
```js
action - {
    action: ( transactionsInfo: transactionsInfo, actionArgs?: object) => any
    actionArgs: {} // Any (optional)
    undoArgs: {} // Any (optional)
    undo?: (error: Error, transactionsInfo: transactionsInfo, undoArgs?: object) => any
}

transactionsInfo = {
    transactions: action[],
    currentTransaction: action,
    previousResponses: { [id]: value },
    previousUndoResponses?: { [id]: value }
}

 result = {
    isSuccess: Boolean, // If an action failed - return false  
    actionsInfo: {
        responses: {
            [id]: value
        }
        errorInfo?: { // If an action failed
            index: number,
            id: string | number,
            error: Error
        }
    },
    undoInfo?: { // if isSuccess === false
        responses: {
            [id]: value
        },
        errorInfo?: [ // / If an undo action failed
            {
                index: number,
                id: string | number,
                error: Error
            }
        ]
    }
}
```

## Method
- `clear()` - Clear the transaction instance from actions.
- `isValidAction(action)` - Check if an action is valid. Return array of erros messages.
- `append(action)` - Append an action to the actions list.
- `appendArray(action[])` - Append actions to the actions list.
- `remove(id)` - Remove an action from the actions list.
- `getTransactions()` - Get all the actions.
## Example
```js
const Transaction = require('pipe-transaction');

// Simple example
const transaction = new Transaction({
    showLogs: true,
    continueOnUndoError: true
}, [
    {
        id: "start",
        action: () => console.log('Start') // Just a sync function
    }
    {
        id: "notifyInProgress"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, using actionArgs
        action: (transactionsInfo, actionArgs) =>
            notifyInProgress(actionArgs.id),
        // Just an async function, using undoArgs
        undo: (transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, using previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, using previousResponses
        undo: (transactionsInfo) => deleteInDb(
             transactionsInfo.previousResponses["notifyInProgress"].id
        ),
    },
    {
        id: "notifyEnd"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, using actionArgs
        action: (transactionsInfo, actionArgs) => 
            notifyEnd(actionArgs.id),
    }
]);

transaction.exec()
    .then(result => {
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done. 
                All relevant undo actions executed");
                
        // result = {
        //     isSuccess: false,
        //     actionsInfo: {
        //          responses: {
        //              start: undefined,
        //              notifyInProgress: {
        //                  id: 1,
        //                  starus: "InProgress"
        //              },
        //              saveInDb: "1234",
        //          },
        //          errorInfo: {
        //              index: 3,
        //              id: "notifyEnd",
        //              error: Error
        //          }
        //     },
        //     undoInfo: {
        //         responses: {
        //              start: undefined,
        //              notifyInProgress: "Successfuly notify failed message",
        //              saveInDb: undefined,
        //          }   
        //     }
        // }
    }).catch(result => {
        console.log("The transaction failed, not all actions done. Undo 
          actions pipeline executed and at least one undo action failed");
                
        // result = {
        //     isSuccess: false,
        //     actionsInfo: {
        //          responses: {
        //              start: undefined,
        //              notifyInProgress: {
        //                  id: 1,
        //                  starus: "InProgress"
        //              },
        //              saveInDb: "1234",
        //          },
        //          errorInfo: {
        //              index: 3,
        //              id: "notifyEnd",
        //              error: Error
        //          }
        //     },
        //     undoInfo: {
        //         responses: {
        //              start: undefined,
        //              saveInDb: undefined,
        //          },
        //          errorInfo" [
        //              {
        //                   index: 1,
        //                   id: "notifyInProgress",
        //                   error: Error
        //              }
        //          ]
        //     }
        // }
    });
    
transaction .clear();

// Other way
const transaction = new Transaction({
    showLogs: true,
    continueOnUndoError: true
})

transaction.appendArray([
    {
        id: "start",
        action: () => console.log('Start') // Just a sync function
    }
    {
        id: "notifyInProgress"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, using actionArgs
        action: (transactionsInfo, actionArgs) =>
            notifyInProgress(actionArgs.id),
        // Just an async function, using undoArgs
        undo: (transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, using previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, using previousResponses
        undo: (transactionsInfo) => deleteInDb(
             transactionsInfo.previousResponses["notifyInProgress"].id
        ),
    }
]);
    
transaction.append({
    id: "notifyEnd"
    actionArgs: {id: "1"},
    undoArgs: {id: "1"},
    // Just an async function, using actionArgs
    action: (transactionsInfo, actionArgs) => 
        notifyEnd(actionArgs.id),
});

transaction.exec()
    .then(result => {
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done. 
                All relevant undo actions executed");
                
        // result = {
        //     isSuccess: true,
        //     actionsInfo: {
        //          responses: {
        //              start: undefined,
        //              notifyInProgress: {
        //                  id: 1,
        //                  starus: "InProgress"
        //              },
        //              saveInDb: "1234",
        //          }
        //     },
        // }
    }).catch(result => {
        console.log("The transaction failed, not all actions done. Undo 
          actions pipeline executed and at least one undo action failed");
                
        // result = {
        //     isSuccess: false,
        //     actionsInfo: {
        //          responses: {
        //              start: undefined,
        //              notifyInProgress: {
        //                  id: 1,
        //                  starus: "InProgress"
        //              },
        //              saveInDb: "1234",
        //          },
        //          errorInfo: {
        //              index: 3,
        //              id: "notifyEnd",
        //              error: Error
        //          }
        //     },
        //     undoInfo: {
        //         responses: {
        //              start: undefined,
        //              saveInDb: undefined,
        //          },
        //          errorInfo" [
        //              {
        //                   index: 1,
        //                   id: "notifyInProgress",
        //                   error: Error
        //              }
        //          ]
        //     }
        // }
    });

transaction .clear();
```

## TypeScript support
pipe-transaction is written in Typescript and supports it perfectly!


### 🏠 [Homepage](https://gitlab.com/ArielDayan/pipe-transaction#readme)


## Author

👤 **Ariel Dayan**


## 🤝 issues

Issues and feature requests are welcome!

Feel free to check [issues page](https://gitlab.com/ArielDayan/pipe-transaction/issues)

## Show your support

Give a ⭐️ if this project helped you!

## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).