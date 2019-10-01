import { t as truncate, A as ActionType } from './utils-7de707a9.js';
import { d as defaultState$5 } from './reducer-d1f43f4d.js';
import { d as defaultState$3, a as defaultState$4, b as defaultState$6 } from './icons-6036010e.js';

const copyProps = (src, target) => {
    for (const p of Object.getOwnPropertyNames(src)) {
        target[p] = src[p];
    }
};
const connect = (store, stateToProp = state => state) => (klass) => class extends klass {
    constructor(...args) {
        super(...args);
        this.subscription = null;
        copyProps(stateToProp(store.getState()), this);
    }
    connectedCallback() {
        super.connectedCallback();
        this.subscription = store.subscribe(() => {
            const props = stateToProp(store.getState());
            copyProps(props, this);
        });
    }
    disconnectedCallback() {
        this.subscription();
        super.disconnectedCallback();
    }
};

function symbolObservablePonyfill(root) {
	var result;
	var Symbol = root.Symbol;

	if (typeof Symbol === 'function') {
		if (Symbol.observable) {
			result = Symbol.observable;
		} else {
			result = Symbol('observable');
			Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
}

/* global window */

var root;

if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = symbolObservablePonyfill(root);

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var randomString = function randomString() {
  return Math.random().toString(36).substring(7).split('').join('.');
};

var ActionTypes = {
  INIT: "@@redux/INIT" + randomString(),
  REPLACE: "@@redux/REPLACE" + randomString(),
  PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
    return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
  }
};

/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  var proto = obj;

  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */

function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'function' || typeof enhancer === 'function' && typeof arguments[3] === 'function') {
    throw new Error('It looks like you are passing several store enhancers to ' + 'createStore(). This is not supported. Instead, compose them ' + 'together to a single function.');
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;
  /**
   * This makes a shallow copy of currentListeners so we can use
   * nextListeners as a temporary list while dispatching.
   *
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a dispatch.
   */

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }
  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */


  function getState() {
    if (isDispatching) {
      throw new Error('You may not call store.getState() while the reducer is executing. ' + 'The reducer has already received the state as an argument. ' + 'Pass it down from the top reducer instead of reading it from the store.');
    }

    return currentState;
  }
  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */


  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.');
    }

    if (isDispatching) {
      throw new Error('You may not call store.subscribe() while the reducer is executing. ' + 'If you would like to be notified after the store has been updated, subscribe from a ' + 'component and invoke store.getState() in the callback to access the latest state. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
    }

    var isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      if (isDispatching) {
        throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
      }

      isSubscribed = false;
      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }
  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */


  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }

    return action;
  }
  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */


  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer; // This action has a similiar effect to ActionTypes.INIT.
    // Any reducers that existed in both the new and old rootReducer
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.

    dispatch({
      type: ActionTypes.REPLACE
    });
  }
  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */


  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe: unsubscribe
        };
      }
    }, _ref[result] = function () {
      return this;
    }, _ref;
  } // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.


  dispatch({
    type: ActionTypes.INIT
  });
  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[result] = observable, _ref2;
}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */


  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
  } catch (e) {} // eslint-disable-line no-empty

}

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionDescription = actionType && "action \"" + String(actionType) + "\"" || 'an action';
  return "Given " + actionDescription + ", reducer \"" + key + "\" returned undefined. " + "To ignore an action, you must explicitly return the previous state. " + "If you want this reducer to hold no value, you can return null instead of undefined.";
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === ActionTypes.INIT ? 'preloadedState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!isPlainObject(inputState)) {
    return "The " + argumentName + " has unexpected type of \"" + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + "\". Expected argument to be an object with the following " + ("keys: \"" + reducerKeys.join('", "') + "\"");
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
  });
  unexpectedKeys.forEach(function (key) {
    unexpectedKeyCache[key] = true;
  });
  if (action && action.type === ActionTypes.REPLACE) return;

  if (unexpectedKeys.length > 0) {
    return "Unexpected " + (unexpectedKeys.length > 1 ? 'keys' : 'key') + " " + ("\"" + unexpectedKeys.join('", "') + "\" found in " + argumentName + ". ") + "Expected to find one of the known reducer keys instead: " + ("\"" + reducerKeys.join('", "') + "\". Unexpected keys will be ignored.");
  }
}

function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, {
      type: ActionTypes.INIT
    });

    if (typeof initialState === 'undefined') {
      throw new Error("Reducer \"" + key + "\" returned undefined during initialization. " + "If the state passed to the reducer is undefined, you must " + "explicitly return the initial state. The initial state may " + "not be undefined. If you don't want to set a value for this reducer, " + "you can use null instead of undefined.");
    }

    if (typeof reducer(undefined, {
      type: ActionTypes.PROBE_UNKNOWN_ACTION()
    }) === 'undefined') {
      throw new Error("Reducer \"" + key + "\" returned undefined when probed with a random type. " + ("Don't try to handle " + ActionTypes.INIT + " or other actions in \"redux/*\" ") + "namespace. They are considered private. Instead, you must return the " + "current state for any unknown actions, unless it is undefined, " + "in which case you must return the initial state, regardless of the " + "action type. The initial state may not be undefined, but can be null.");
    }
  });
}
/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */


function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};

  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];

    {
      if (typeof reducers[key] === 'undefined') {
        warning("No reducer provided for key \"" + key + "\"");
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }

  var finalReducerKeys = Object.keys(finalReducers); // This is used to make sure we don't warn about the same
  // keys multiple times.

  var unexpectedKeyCache;

  {
    unexpectedKeyCache = {};
  }

  var shapeAssertionError;

  try {
    assertReducerShape(finalReducers);
  } catch (e) {
    shapeAssertionError = e;
  }

  return function combination(state, action) {
    if (state === void 0) {
      state = {};
    }

    if (shapeAssertionError) {
      throw shapeAssertionError;
    }

    {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);

      if (warningMessage) {
        warning(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};

    for (var _i = 0; _i < finalReducerKeys.length; _i++) {
      var _key = finalReducerKeys[_i];
      var reducer = finalReducers[_key];
      var previousStateForKey = state[_key];
      var nextStateForKey = reducer(previousStateForKey, action);

      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(_key, action);
        throw new Error(errorMessage);
      }

      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    return hasChanged ? nextState : state;
  };
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    keys.push.apply(keys, Object.getOwnPropertySymbols(object));
  }

  if (enumerableOnly) keys = keys.filter(function (sym) {
    return Object.getOwnPropertyDescriptor(object, sym).enumerable;
  });
  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(source, true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(source).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
function compose() {
  for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(function (a, b) {
    return function () {
      return a(b.apply(void 0, arguments));
    };
  });
}

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */

function applyMiddleware() {
  for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function () {
      var store = createStore.apply(void 0, arguments);

      var _dispatch = function dispatch() {
        throw new Error('Dispatching while constructing your middleware is not allowed. ' + 'Other middleware would not be applied to this dispatch.');
      };

      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch() {
          return _dispatch.apply(void 0, arguments);
        }
      };
      var chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = compose.apply(void 0, chain)(store.dispatch);
      return _objectSpread2({}, store, {
        dispatch: _dispatch
      });
    };
  };
}

/*
 * This is a dummy function to check if the function name has been altered by minification.
 * If the function has been minified and NODE_ENV !== 'production', warn the user.
 */

function isCrushed() {}

if ( typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  warning('You are currently using minified code outside of NODE_ENV === "production". ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or setting mode to production in webpack (https://webpack.js.org/concepts/mode/) ' + 'to ensure you have the correct code for your production build.');
}

function createThunkMiddleware(extraArgument) {
  return function (_ref) {
    var dispatch = _ref.dispatch,
        getState = _ref.getState;
    return function (next) {
      return function (action) {
        if (typeof action === 'function') {
          return action(dispatch, getState, extraArgument);
        }

        return next(action);
      };
    };
  };
}

var thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';
const factory = ({ endpoint = DEFAULT_ENDPOINT_ROOT } = { endpoint: DEFAULT_ENDPOINT_ROOT }) => {
    let searchDirectionController = null;
    return {
        async search(points) {
            if (searchDirectionController) {
                searchDirectionController.abort();
            }
            searchDirectionController = new AbortController();
            try {
                const waypoints = points.map(({ lat, lng }) => ({
                    lat: truncate(lat),
                    lng: truncate(lng)
                }));
                const url = new URL('/direction', endpoint);
                const body = {
                    waypoints
                };
                const res = await fetch(url.toString(), {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                if (res.ok !== true) {
                    throw new Error('not ok response');
                }
                return (await res.json()).routes;
            }
            finally {
                searchDirectionController = null;
            }
        }
    };
};

const DEFAULT_ENDPOINT_ROOT$1 = 'https://api.citykleta-test.com';
const factory$1 = ({ endpoint = DEFAULT_ENDPOINT_ROOT$1 } = { endpoint: DEFAULT_ENDPOINT_ROOT$1 }) => {
    let searchAbortController = null;
    return {
        async searchPointsOfInterest(query = '') {
            if (searchAbortController) {
                searchAbortController.abort();
            }
            searchAbortController = new AbortController();
            try {
                const url = new URL(`/poi?search=${encodeURIComponent(query)}`, endpoint);
                const res = await fetch(url.toString(), {
                    signal: searchAbortController.signal
                });
                if (res.ok !== true) {
                    throw new Error('not ok response');
                }
                const raw = await res.json();
                return raw.map(i => Object.assign(i, { municipality: i.address.municipality }));
            }
            finally {
                searchAbortController = null;
            }
        },
        async searchAddress(query = '') {
            const url = new URL(`/address?search=${encodeURIComponent(query)}`, endpoint);
            // if we have requested an address lookup we stop any ongoing points of interest lookup
            if (searchAbortController) {
                searchAbortController.abort();
            }
            const res = await fetch(url.toString());
            if (res.ok !== true) {
                throw new Error('something went wrong');
            }
            return res.json();
        },
        async reverse(coordinates) {
            const url = new URL(`/location?lng=${coordinates.lng}&lat=${coordinates.lat}`, endpoint);
            const res = await fetch(url.toString());
            if (res.ok !== true) {
                throw new Error('not ok response'); //todo handler error in a different way
            }
            const raw = await res.json();
            return raw.map(i => Object.assign(i, { municipality: i.address.municipality }));
        }
    };
};

const DEFAULT_ENDPOINT_ROOT$2 = 'https://api.citykleta-test.com';
const factory$2 = ({ endpoint = DEFAULT_ENDPOINT_ROOT$2 } = { endpoint: DEFAULT_ENDPOINT_ROOT$2 }) => {
    let leisureController = null;
    return {
        async searchRoutes() {
            if (leisureController) {
                leisureController.abort();
            }
            leisureController = new AbortController();
            try {
                const url = new URL(`/leisure`, endpoint);
                const res = await fetch(url.toString(), {
                    signal: leisureController.signal
                });
                if (res.ok !== true) {
                    throw new Error('not ok response');
                }
                return res.json();
            }
            finally {
                leisureController = null;
            }
        }
    };
};

const defaultState = () => ({
    routes: [],
    isSearching: false,
    selectedRouteId: null
});
const reducer = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.FETCH_LEISURE_ROUTES:
            return {
                isSearching: true,
                routes: [],
                selectedRouteId: null
            };
        case ActionType.FETCH_LEISURE_ROUTES_SUCCESS: {
            return {
                routes: action.result,
                isSearching: false,
                selectedRouteId: action.result.length > 0 ? action.result[0].id : null
            };
        }
        case ActionType.FETCH_LEISURE_ROUTES_FAILURE:
            return Object.assign({}, previousState, { isSearching: false });
        case ActionType.SELECT_LEISURE_ROUTE: {
            const selectedRouteId = previousState.routes.some(r => r.id === action.routeId) ? action.routeId : previousState.selectedRouteId;
            return Object.assign({}, previousState, { selectedRouteId });
        }
        default:
            return previousState;
    }
};

var apiConf = Object.freeze({
    endpoint: 'http://localhost:3000'
});

var View;
(function (View) {
    View["SEARCH"] = "SEARCH";
    View["SETTINGS"] = "SETTINGS";
    View["ITINERARY"] = "ITINERARY";
    View["LEISURE"] = "LEISURE";
})(View || (View = {}));
const defaultState$1 = () => ({
    selectedView: View.SEARCH
});
const reducer$1 = (previousState = defaultState$1(), action) => {
    switch (action.type) {
        case ActionType.SELECT_VIEW:
            return Object.assign({}, previousState, { selectedView: action.view });
        default:
            return previousState;
    }
};

const createReducer = (reducers) => {
    const combined = combineReducers(reducers);
    return (state = defaultState$2, action) => {
        if (action.type === ActionType.CHANGE_HISTORY_POINT) {
            return action.state;
        }
        return combined(state, action);
    };
};

const defaultState$2 = () => ({
    navigation: defaultState$1(),
    itinerary: defaultState$3(),
    search: defaultState$4(),
    settings: defaultState$5(),
    map: defaultState$6(),
    leisure: defaultState()
});
const defaultAPI = {
    directions: factory({
        endpoint: apiConf.endpoint
    }),
    geocoder: factory$1({
        endpoint: apiConf.endpoint
    }),
    leisure: factory$2({
        endpoint: apiConf.endpoint
    })
};
// placeholder for dynamically injected reducers
const passThroughReducer = (state = {}) => state;
const store = (api = defaultAPI) => (initialState = defaultState$2()) => {
    const staticReducer = {
        navigation: reducer$1,
        map: passThroughReducer,
        itinerary: passThroughReducer,
        settings: passThroughReducer,
        search: passThroughReducer,
        leisure: passThroughReducer
    };
    // @ts-ignore
    const store = createStore(createReducer(staticReducer), initialState, applyMiddleware(thunk.withExtraArgument(api)));
    const dynamicReducers = {};
    // @ts-ignore
    return Object.assign(store, {
        injectReducer(key, reducer) {
            dynamicReducers[key] = reducer;
            store.replaceReducer(createReducer(Object.assign({}, staticReducer, dynamicReducers)));
        }
    });
};

// todo it is a rough serialization could be optimized as we shall know the data structure (to be check too we backward compatibility issues in case of structure changes)
const serializeData = (state) => btoa(JSON.stringify(project(state)));
const deserializeData = (encoded) => JSON.parse(atob(encoded));
const mergeStates = (...states) => {
    const [init, ...rest] = states;
    return rest.reduce((acc, curr) => {
        acc.search = Object.assign({}, acc.search, curr.search);
        acc.itinerary = Object.assign({}, acc.itinerary, curr.itinerary);
        return acc;
    }, init);
};
const project = (state) => {
    switch (state.navigation.selectedView) {
        case View.ITINERARY:
            return { itinerary: { stops: state.itinerary.stops } };
        case View.SEARCH:
            return { search: { selectedSearchResult: state.search.selectedSearchResult } };
        case View.LEISURE:
            return {};
        default:
            return {};
    }
};
const serialize = (state) => {
    const view = state.navigation.selectedView;
    const location = [...state.map.center.map(v => truncate(v, 8)), `${state.map.zoom}z`].join((','));
    const data = serializeData(state);
    return new URL(`/${view.toLowerCase()}/@${location}/data=${data}`, window.location.origin);
};
const viewRegexp = /^(settings|search|itinerary|leisure)/;
const locationRegexp = /^@.*z$/;
const dataRegexp = /^data=/;
const deserialize = (url) => {
    try {
        const parts = url.pathname.split('/');
        const view = parts.find(v => viewRegexp.test(v));
        const location = parts.find(v => locationRegexp.test(v));
        const data = parts.find(v => dataRegexp.test(v));
        let state = defaultState$2();
        if (view) {
            state.navigation.selectedView = view.toUpperCase();
        }
        if (location) {
            const [lng, lat, zoom] = location.slice(1).split(',');
            state.map.center = [Number(lng), Number(lat)];
            state.map.zoom = Number(zoom.slice(0, zoom.length - 1));
        }
        if (data) {
            const decoded = deserializeData(data.slice(5));
            state = mergeStates(state, decoded);
        }
        return state;
    }
    catch (e) {
        console.log(e);
        return defaultState$2();
    }
};
const storage = (window) => {
    return {
        async get() {
            return deserialize(window.location.href);
        },
        async set(state) {
            const url = serialize(state);
            if (url.href !== window.location.href) {
                window.history.pushState(state, '', url.pathname);
            }
        }
    };
};

const initialState = deserialize(new URL(window.location.href));
var store$1 = store()(initialState);

export { View as V, storage as a, connect as c, defaultState as d, reducer as r, store$1 as s };
//# sourceMappingURL=index-10724ddd.js.map
