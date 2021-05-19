# Welcome to pipe-transaction 👋
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](#)

<!-- # pipe-transaction -->

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url] [![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]

[npm-url]:https://npmjs.org/package/promise-retry
[downloads-image]:http://img.shields.io/npm/dm/promise-retry.svg
[npm-image]:http://img.shields.io/npm/v/promise-retry.svg
[travis-url]:https://travis-ci.org/IndigoUnited/node-promise-retry
[travis-image]:http://img.shields.io/travis/IndigoUnited/node-promise-retry/master.svg
[david-dm-url]:https://david-dm.org/IndigoUnited/node-promise-retry
[david-dm-image]:https://img.shields.io/david/IndigoUnited/node-promise-retry.svg
[david-dm-dev-url]:https://david-dm.org/IndigoUnited/node-promise-retry?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/IndigoUnited/node-promise-retry.svg
[greenkeeper-image]:https://badges.greenkeeper.io/IndigoUnited/node-promise-retry.svg
[greenkeeper-url]:https://greenkeeper.io/

pipe-transaction is the official library for managing multi-stage operations.

This library is designed to help deal with the easiest situation possible in an all so common situation where you are required to perform a number of actions when this process will be considered a success only if all the actions happen.

If all goes well (and it never goes right) then all is well, but if any process fails along the way and you want to return to an initial state or another state as a result of the failure, the situation begins to get complicated.

For example, if you want to update the database through CRUD, after doing something (such as saving a file), you can return to the initial state (delete the file) if the database update failed.

After many searches on the net for solutions worthy of such situations and much thought on the matter, a simple and available solution is not found, and here pipe-transaction enters the picture.

The library is very easy to use and allows for a wide range of different settings and applications, pipe-transaction support async & sync actions at once.

> The official library for managing multi-stage operations.

## Installation

`$ npm install pipe-transaction`


## Usage

### promiseRetry(fn, [options])

Calls `fn` until the returned promise ends up fulfilled or rejected with an error different than
a `retry` error.   
The `options` argument is an object which maps to the [retry](https://github.com/tim-kos/node-retry) module options:

- `retries`: The maximum amount of times to retry the operation. Default is `10`.
- `factor`: The exponential factor to use. Default is `2`.
- `minTimeout`: The number of milliseconds before starting the first retry. Default is `1000`.
- `maxTimeout`: The maximum number of milliseconds between two retries. Default is `Infinity`.
- `randomize`: Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `false`.


The `fn` function will receive a `retry` function as its first argument that should be called with an error whenever you want to retry `fn`. The `retry` function will always throw an error.   
If there are retries left, it will throw a special `retry` error that will be handled internally to call `fn` again.
If there are no retries left, it will throw the actual error passed to it.

If you prefer, you can pass the options first using the alternative function signature `promiseRetry([options], fn)`.

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
        
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done, 
                undo actions were executed");
    }).catch(result => {
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
        
        console.log("The transaction failed, not all actions done, undo 
                actions were executed, and also failed");
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
        
        if(result.isSuccess) 
            console.log("The transaction success, all actions done");
        else 
            console.log("The transaction failed, not all actions done, 
                undo actions were executed");
    }).catch(result => {
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
        
        console.log("The transaction failed, not all actions done, undo 
                actions were executed, and also failed");
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