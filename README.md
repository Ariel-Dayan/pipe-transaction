# Welcome to pipe-transaction 👋
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000) [![License: ISC](https://img.shields.io/badge/License-MIT-yellow.svg)](#) 

pipe-transaction is the official library for managing multi-stage operations.

This library is designed to help deal with the easiest situation possible in an all so common situation where you are required to perform a number of actions when this process will be considered a success only if all the actions happen.

If all goes well (and it never goes right) then all is well, but if any process fails along the way and you want to return to an initial state or another state as a result of the failure, the situation begins to get complicated.

For example, if you want to update the database through CRUD, after doing something (such as saving a file), you can return to the initial state (delete the file) if the database update failed.

After many searches on the net for solutions worthy of such situations and much thought on the matter, a simple and available solution is not found, and here pipe-transaction enters the picture.

The library is very easy to use and allows for a wide range of different settings and applications, pipe-transaction support async & sync actions at once.

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
`options`(optional) - an object that include the setting of the `Transaction` instance. (see below for options). 
- `showLogs`: Boolean. Allow the library to write errors & information message to the console. Default is `true`.
- `autoIdGenerate`: Boolean. Allow the library to generate automatic number id for the actions, start from `0`. Default is `false`.
- `continueOnUndoError`:  Boolean. When an action failed, Allow the library to continue all relevant undo functions if an undo function failed. Defult `true`.
- `retryOptions`: An object which maps to the [retry](https://github.com/tim-kos/node-retry) module options:
    - `retries`: Number. The maximum amount of times to retry the operation. Default is `10`.
    - `factor`: Number. The exponential factor to use. Default is `2`.
    - `minTimeout`: Number. The number of milliseconds before starting the first retry. Default is `1000`.
    - `maxTimeout`: Number. The maximum number of milliseconds between two retries. Default is `Infinity`.
    - `randomize`: Boolean. Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `false`.
    - `errorRetryHandler`: Function. Custom callback that should be called if retry of an action is failed. The `errorRetryHandler` function will receive two argument: first `retyNumber` - The number of failed retries, start from `0`, second `transactionsInfo` - Object that describe the transactions statues (see below for `transactionsInfo` structure).

`actions`(optional) - an array of an `action` description (see below for `action` structure).

### exec()

Execute the actions pipeline. Return `result` object (see below for `result` structure) if all the actions success or if action failed but all the relevant undo actions success. Throw `result` object if an actions failed and at least relevant unto action failed.

## Models
```js
action - {
    action: ( transactionsInfo: transactionsInfo, actionArgs?: object) => any
    actionArgs: {} // You pass (optional)
    undoArgs: {} // You pass (optional)
    undo?: (error: Error, transactionsInfo: transactionsInfo, undoArgs?: object) => any
}

transactionsInfo = {
    transactions: action[],
    currentTransaction: action,
    previousResponses: { [id]: value },
    previousUndoResponses?: { [id]: value }
}

 result = {
    isSuccess: Boolean, // If an action failed - false  
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
- `clear()` - Clear the transaction instance from actions
- `isValidAction(action)` - Check if an action is valid. Return array of erros message
- `append(action)` - Append an action to the actions list
- `appendArray(action[])` - Append actions to the actions list
- `remove(id)` - Remove an action from the actions list
- `getTransactions()` - Get all the actions
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
        action: () => console.log('Start') // Just an sync function
    }
    {
        id: "notifyInProgress"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, used actionArgs
        action: (transactionsInfo, actionArgs) =>
            notifyInProgress(actionArgs.id),
        // Just an async function, used undoArgs
        undo: (transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, used previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, used previousResponses
        undo: (transactionsInfo) => deleteInDb(
             transactionsInfo.previousResponses["notifyInProgress"].id
        ),
    },
    {
        id: "notifyEnd"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, used actionArgs
        action: (transactionsInfo, actionArgs) => 
            notifyEnd(actionArgs.id),
    }
]);

transaction.exec()
    .then(result => {
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done, 
                undo actions were executed");
                
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
        //              notifyInProgress: "Successfuly notify failed",
        //              saveInDb: undefined,
        //          }   
        //     }
        // }
    }).catch(result => {
        console.log("The transaction failed, not all actions done, undo 
                actions were executed, and also failed");
                
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
        action: () => console.log('Start') // Just an sync function
    }
    {
        id: "notifyInProgress"
        actionArgs: {id: "1"},
        undoArgs: {id: "1"},
        // Just an async function, used actionArgs
        action: (transactionsInfo, actionArgs) =>
            notifyInProgress(actionArgs.id),
        // Just an async function, used undoArgs
        undo: (transactionsInfo, undoArgs) => notifyFailed(undoArgs.id) 
    },
    {
        id: "saveInDb"
        // Just an async function, used previousResponses
        action: (transactionsInfo) => saveInDb(
             transactionsInfo.previousResponses["notifyInProgress"]
        ),
        // Just an async function, used previousResponses
        undo: (transactionsInfo) => deleteInDb(
             transactionsInfo.previousResponses["notifyInProgress"].id
        ),
    }
]);
    
transaction.append({
    id: "notifyEnd"
    actionArgs: {id: "1"},
    undoArgs: {id: "1"},
    // Just an async function, used actionArgs
    action: (transactionsInfo, actionArgs) => 
        notifyEnd(actionArgs.id),
});

transaction.exec()
    .then(result => {
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done, 
                undo actions were executed");
                
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
        console.log("The transaction failed, not all actions done, undo 
                actions were executed, and also failed");
                
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