# Welcome to pipe-transaction 👋
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#) ![Stars](https://img.shields.io/github/stars/Ariel-Dayan/pipe-transaction) [![npm version](https://badge.fury.io/js/pipe-transaction.svg)](https://badge.fury.io/js/pipe-transaction)

pipe-transaction is the official library for managing multi-stage operations.

pipe-transaction designed to easily deal with common situations that you are want to perform several related actions. This process will be considered a success only if **all** the actions are performed. 

In another hand, if any process fails along the way - the situation became complicated. In this case, you want to be able to return to the initial state as much as another state as a result of the failure. For this purpose exactly, pipe-transaction developed.

For example, if you want to update the database through CRUD API, after executing action (such as saving a file), pipe-transaction helps you to return to the initial state (delete the file) if the database update failed.

The library is very easy to use and allows a wide range of different options. pipe-transaction support async & sync actions at once.

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
`options`(optional) - an object that includes the setting of the `Transaction` instance. 
- `showLogs`: Boolean. Allow the library to write errors & information messages to the console. Default is `true`.
- `autoIdGenerate`: Boolean. Allow the library to generate an automatic number id for the actions, start from `0`. Default is `false`.
- `continueOnUndoError`:  Boolean. When an action failed, Allow the library to continue to execute all relevant undo functions, even if an undo function failed. Default `true`.
- `retryOptions`: An object which maps to the [retry](https://github.com/tim-kos/node-retry) module options:
    - `retries`: Number. The maximum amount of times to retry the operation. Default is `3`.
    - `factor`: Number. The exponential factor to use. Default is `2`.
    - `minTimeout`: Number. The number of milliseconds before starting the first retry. Default is `1000`.
    - `maxTimeout`: Number. The maximum number of milliseconds between two retries. Default is `Infinity`.
    - `randomize`: Boolean. Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `false`.
    - `errorRetryHandler`: Function. Custom callback function that should be called if retry of action is failed. The `errorRetryHandler` function received two arguments: First `retyNumber` - The number of failed retries, starts from `0`. Second `transactionsInfo` - Object that describe the transactions statues (see below for `transactionsInfo` structure).

`actions`(optional) - Array of `actions` description (see below for `action` structure).

### exec()

Execute the actions pipeline. Return `result` object (see below for `result` structure) if all the actions succeed, or if an action failed but all the relevant undo actions succeed. Throw `result` object if an action failed and at least a relevant unto action failed.

## Models
```js
action = {
    action: ( transactionsInfo: transactionsInfo, actionArgs?: object) => any
    actionArgs: {} // Any (optional)
    undoArgs: {} // Any (optional)
    undo?: (error: any, transactionsInfo: transactionsInfo, undoArgs?: object) => any
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
        undo: (error, transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, using previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, using previousResponses
        undo: (error, transactionsInfo) => deleteInDb(
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
        undo: (error, transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, using previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, using previousResponses
        undo: (error, transactionsInfo) => deleteInDb(
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


### 🏠 [Homepage](https://github.com/Ariel-Dayan/pipe-transaction#readme)


## Author

👤 **Ariel Dayan**


## 🤝 issues

Issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/Ariel-Dayan/pipe-transaction/issues)

## Show your support

Give a ⭐️ if this project helped you!

## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).