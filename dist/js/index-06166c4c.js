import { t as truncate, d as decodeLine, h as html, A as ActionType, a as defaultState$6 } from './utils-21cfdb4b.js';

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

/**
 * Earth Radius used with the Harvesine formula and approximates using a spherical (non-ellipsoid) Earth.
 */
var earthRadius = 6371008.8;

/**
 * Unit of measurement factors using a spherical (non-ellipsoid) earth radius.
 */
var factors = {
    meters: earthRadius,
    metres: earthRadius,
    millimeters: earthRadius * 1000,
    millimetres: earthRadius * 1000,
    centimeters: earthRadius * 100,
    centimetres: earthRadius * 100,
    kilometers: earthRadius / 1000,
    kilometres: earthRadius / 1000,
    miles: earthRadius / 1609.344,
    nauticalmiles: earthRadius / 1852,
    inches: earthRadius * 39.370,
    yards: earthRadius / 1.0936,
    feet: earthRadius * 3.28084,
    radians: 1,
    degrees: earthRadius / 111325,
};

/**
 * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
 *
 * @name feature
 * @param {Geometry} geometry input geometry
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature} a GeoJSON Feature
 * @example
 * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
 *
 * var feature = turf.feature(geometry);
 *
 * //=feature
 */
function feature(geometry, properties, options) {
    // Optional Parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var bbox = options.bbox;
    var id = options.id;

    // Validation
    if (geometry === undefined) throw new Error('geometry is required');
    if (properties && properties.constructor !== Object) throw new Error('properties must be an Object');
    if (bbox) validateBBox(bbox);
    if (id) validateId(id);

    // Main
    var feat = {type: 'Feature'};
    if (id) feat.id = id;
    if (bbox) feat.bbox = bbox;
    feat.properties = properties || {};
    feat.geometry = geometry;
    return feat;
}

/**
 * Creates a {@link Point} {@link Feature} from a Position.
 *
 * @name point
 * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Point>} a Point feature
 * @example
 * var point = turf.point([-75.343, 39.984]);
 *
 * //=point
 */
function point(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');
    if (coordinates.length < 2) throw new Error('coordinates must be at least 2 numbers long');
    if (!isNumber(coordinates[0]) || !isNumber(coordinates[1])) throw new Error('coordinates must contain numbers');

    return feature({
        type: 'Point',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name radiansToLength
 * @param {number} radians in radians across the sphere
 * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
 * @returns {number} distance
 */
function radiansToLength(radians, units) {
    if (radians === undefined || radians === null) throw new Error('radians is required');

    if (units && typeof units !== 'string') throw new Error('units must be a string');
    var factor = factors[units || 'kilometers'];
    if (!factor) throw new Error(units + ' units is invalid');
    return radians * factor;
}

/**
 * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into radians
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name lengthToRadians
 * @param {number} distance in real units
 * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
 * @returns {number} radians
 */
function lengthToRadians(distance, units) {
    if (distance === undefined || distance === null) throw new Error('distance is required');

    if (units && typeof units !== 'string') throw new Error('units must be a string');
    var factor = factors[units || 'kilometers'];
    if (!factor) throw new Error(units + ' units is invalid');
    return distance / factor;
}

/**
 * Converts an angle in radians to degrees
 *
 * @name radiansToDegrees
 * @param {number} radians angle in radians
 * @returns {number} degrees between 0 and 360 degrees
 */
function radiansToDegrees(radians) {
    if (radians === null || radians === undefined) throw new Error('radians is required');

    var degrees = radians % (2 * Math.PI);
    return degrees * 180 / Math.PI;
}

/**
 * Converts an angle in degrees to radians
 *
 * @name degreesToRadians
 * @param {number} degrees angle between 0 and 360 degrees
 * @returns {number} angle in radians
 */
function degreesToRadians(degrees) {
    if (degrees === null || degrees === undefined) throw new Error('degrees is required');

    var radians = degrees % 360;
    return radians * Math.PI / 180;
}

/**
 * isNumber
 *
 * @param {*} num Number to validate
 * @returns {boolean} true/false
 * @example
 * turf.isNumber(123)
 * //=true
 * turf.isNumber('foo')
 * //=false
 */
function isNumber(num) {
    return !isNaN(num) && num !== null && !Array.isArray(num);
}

/**
 * isObject
 *
 * @param {*} input variable to validate
 * @returns {boolean} true/false
 * @example
 * turf.isObject({elevation: 10})
 * //=true
 * turf.isObject('foo')
 * //=false
 */
function isObject(input) {
    return (!!input) && (input.constructor === Object);
}

/**
 * Validate BBox
 *
 * @private
 * @param {Array<number>} bbox BBox to validate
 * @returns {void}
 * @throws Error if BBox is not valid
 * @example
 * validateBBox([-180, -40, 110, 50])
 * //=OK
 * validateBBox([-180, -40])
 * //=Error
 * validateBBox('Foo')
 * //=Error
 * validateBBox(5)
 * //=Error
 * validateBBox(null)
 * //=Error
 * validateBBox(undefined)
 * //=Error
 */
function validateBBox(bbox) {
    if (!bbox) throw new Error('bbox is required');
    if (!Array.isArray(bbox)) throw new Error('bbox must be an Array');
    if (bbox.length !== 4 && bbox.length !== 6) throw new Error('bbox must be an Array of 4 or 6 numbers');
    bbox.forEach(function (num) {
        if (!isNumber(num)) throw new Error('bbox must only contain numbers');
    });
}

/**
 * Validate Id
 *
 * @private
 * @param {string|number} id Id to validate
 * @returns {void}
 * @throws Error if Id is not valid
 * @example
 * validateId([-180, -40, 110, 50])
 * //=Error
 * validateId([-180, -40])
 * //=Error
 * validateId('Foo')
 * //=OK
 * validateId(5)
 * //=OK
 * validateId(null)
 * //=Error
 * validateId(undefined)
 * //=Error
 */
function validateId(id) {
    if (!id) throw new Error('id is required');
    if (['string', 'number'].indexOf(typeof id) === -1) throw new Error('id must be a number or a string');
}

/**
 * Unwrap a coordinate from a Point Feature, Geometry or a single coordinate.
 *
 * @name getCoord
 * @param {Array<number>|Geometry<Point>|Feature<Point>} coord GeoJSON Point or an Array of numbers
 * @returns {Array<number>} coordinates
 * @example
 * var pt = turf.point([10, 10]);
 *
 * var coord = turf.getCoord(pt);
 * //= [10, 10]
 */
function getCoord(coord) {
    if (!coord) throw new Error('coord is required');
    if (coord.type === 'Feature' && coord.geometry !== null && coord.geometry.type === 'Point') return coord.geometry.coordinates;
    if (coord.type === 'Point') return coord.coordinates;
    if (Array.isArray(coord) && coord.length >= 2 && coord[0].length === undefined && coord[1].length === undefined) return coord;

    throw new Error('coord must be GeoJSON Point or an Array of numbers');
}

//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html

/**
 * Takes two {@link Point|points} and finds the geographic bearing between them,
 * i.e. the angle measured in degrees from the north line (0 degrees)
 *
 * @name bearing
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.final=false] calculates the final bearing if true
 * @returns {number} bearing in decimal degrees, between -180 and 180 degrees (positive clockwise)
 * @example
 * var point1 = turf.point([-75.343, 39.984]);
 * var point2 = turf.point([-75.534, 39.123]);
 *
 * var bearing = turf.bearing(point1, point2);
 *
 * //addToMap
 * var addToMap = [point1, point2]
 * point1.properties['marker-color'] = '#f00'
 * point2.properties['marker-color'] = '#0f0'
 * point1.properties.bearing = bearing
 */
function bearing(start, end, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var final = options.final;

    // Reverse calculation
    if (final === true) return calculateFinalBearing(start, end);

    var coordinates1 = getCoord(start);
    var coordinates2 = getCoord(end);

    var lon1 = degreesToRadians(coordinates1[0]);
    var lon2 = degreesToRadians(coordinates2[0]);
    var lat1 = degreesToRadians(coordinates1[1]);
    var lat2 = degreesToRadians(coordinates2[1]);
    var a = Math.sin(lon2 - lon1) * Math.cos(lat2);
    var b = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

    return radiansToDegrees(Math.atan2(a, b));
}

/**
 * Calculates Final Bearing
 *
 * @private
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @returns {number} bearing
 */
function calculateFinalBearing(start, end) {
    // Swap start & end
    var bear = bearing(end, start);
    bear = (bear + 180) % 360;
    return bear;
}

//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html
/**
 * Takes a {@link Point} and calculates the location of a destination point given a distance in degrees, radians, miles, or kilometers; and bearing in degrees. This uses the [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula) to account for global curvature.
 *
 * @name destination
 * @param {Coord} origin starting point
 * @param {number} distance distance from the origin point
 * @param {number} bearing ranging from -180 to 180
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] miles, kilometers, degrees, or radians
 * @param {Object} [options.properties={}] Translate properties to Point
 * @returns {Feature<Point>} destination point
 * @example
 * var point = turf.point([-75.343, 39.984]);
 * var distance = 50;
 * var bearing = 90;
 * var options = {units: 'miles'};
 *
 * var destination = turf.destination(point, distance, bearing, options);
 *
 * //addToMap
 * var addToMap = [point, destination]
 * destination.properties['marker-color'] = '#f00';
 * point.properties['marker-color'] = '#0f0';
 */
function destination(origin, distance, bearing, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var units = options.units;
    var properties = options.properties;

    // Handle input
    var coordinates1 = getCoord(origin);
    var longitude1 = degreesToRadians(coordinates1[0]);
    var latitude1 = degreesToRadians(coordinates1[1]);
    var bearing_rad = degreesToRadians(bearing);
    var radians = lengthToRadians(distance, units);

    // Main
    var latitude2 = Math.asin(Math.sin(latitude1) * Math.cos(radians) +
        Math.cos(latitude1) * Math.sin(radians) * Math.cos(bearing_rad));
    var longitude2 = longitude1 + Math.atan2(Math.sin(bearing_rad) * Math.sin(radians) * Math.cos(latitude1),
        Math.cos(radians) - Math.sin(latitude1) * Math.sin(latitude2));
    var lng = radiansToDegrees(longitude2);
    var lat = radiansToDegrees(latitude2);

    return point([lng, lat], properties);
}

//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html

/**
 * Calculates the distance between two {@link Point|points} in degrees, radians,
 * miles, or kilometers. This uses the
 * [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula)
 * to account for global curvature.
 *
 * @name distance
 * @param {Coord} from origin point
 * @param {Coord} to destination point
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
 * @returns {number} distance between the two points
 * @example
 * var from = turf.point([-75.343, 39.984]);
 * var to = turf.point([-75.534, 39.123]);
 * var options = {units: 'miles'};
 *
 * var distance = turf.distance(from, to, options);
 *
 * //addToMap
 * var addToMap = [from, to];
 * from.properties.distance = distance;
 * to.properties.distance = distance;
 */
function distance(from, to, options) {
    // Optional parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var units = options.units;

    var coordinates1 = getCoord(from);
    var coordinates2 = getCoord(to);
    var dLat = degreesToRadians((coordinates2[1] - coordinates1[1]));
    var dLon = degreesToRadians((coordinates2[0] - coordinates1[0]));
    var lat1 = degreesToRadians(coordinates1[1]);
    var lat2 = degreesToRadians(coordinates2[1]);

    var a = Math.pow(Math.sin(dLat / 2), 2) +
          Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

    return radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), units);
}

/**
 * Takes two {@link Point|points} and returns a point midway between them.
 * The midpoint is calculated geodesically, meaning the curvature of the earth is taken into account.
 *
 * @name midpoint
 * @param {Coord} point1 first point
 * @param {Coord} point2 second point
 * @returns {Feature<Point>} a point midway between `pt1` and `pt2`
 * @example
 * var point1 = turf.point([144.834823, -37.771257]);
 * var point2 = turf.point([145.14244, -37.830937]);
 *
 * var midpoint = turf.midpoint(point1, point2);
 *
 * //addToMap
 * var addToMap = [point1, point2, midpoint];
 * midpoint.properties['marker-color'] = '#f00';
 */
function midpoint(point1, point2) {
    var dist = distance(point1, point2);
    var heading = bearing(point1, point2);
    var midpoint = destination(point1, dist / 2, heading);

    return midpoint;
}

const EMPTY_SOURCE = Object.freeze({
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
});

const decodeLineString = geometry => {
    const output = Object.assign({}, geometry);
    output.coordinates = decodeLine(geometry.coordinates);
    return output;
};

// todo better composition
const fromLine = (item) => ({
    toPoint() {
        const line = decodeLine(item.geometry.coordinates);
        const points = [line[0], line[line.length - 1]]
            .map(p => p.reverse());
        const center = midpoint(points[0], points[1])
            .geometry
            .coordinates;
        return {
            lng: center[1],
            lat: center[0]
        };
    },
    toGeoFeature() {
        return decodeLineString(item.geometry);
    }
});
const createCornerSearchResult = (item) => {
    return {
        toOptionElement() {
            return html `esquina entre <strong>${item.streets[0]}</strong> y <strong>${item.streets[1]}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html `
<citykleta-location .location=${item}>
    <span slot="title">${item.streets[0] + ' y ' + item.streets[1]}</span>
</citykleta-location>`;
        },
        toPoint() {
            return {
                lng: item.geometry.coordinates[0],
                lat: item.geometry.coordinates[1]
            };
        },
        toGeoFeature() {
            return item.geometry;
        },
        toString() {
            return `esquina ${item.streets[0]} y ${item.streets[1]}, ${item.municipality}`;
        }
    };
};
const createBlockSearchResult = (item) => {
    return Object.assign(fromLine(item), {
        toOptionElement() {
            return html `<strong>${item.name}</strong> entre <strong>${item.intersections[0].name}</strong> y <strong>${item.intersections[1].name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html `
<citykleta-location .location=${item}>
    <span slot="title">Cuadra en ${item.name}</span>
</citykleta-location>`;
        },
        toString() {
            return `${item.name} e/ ${item.intersections[0].name} y ${item.intersections[1].name}, ${item.municipality}`;
        }
    });
};
const createStreetSearchResult = (item) => {
    return Object.assign(fromLine(item), {
        toOptionElement() {
            return html `<strong>${item.name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html `
<citykleta-location .location=${item}></citykleta-location>`;
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        }
    });
};
const createPointOfInterestSearchResult = (item) => {
    return {
        toOptionElement() {
            return html `${item.name},<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            const { address = {} } = item;
            const addressPart = [
                address.street,
                address.number ? `#${address.number}` : ''
            ]
                .filter(Boolean)
                .join(' ');
            return html `
<citykleta-location .location=${item}>
    <div slot="address">${html `${addressPart ? addressPart + ', ' : ''}<em>${item.municipality}</em>`}</div>
</citykleta-location>`;
        },
        toPoint() {
            const [lng, lat] = item.geometry.coordinates;
            return {
                lng,
                lat
            };
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        },
        toGeoFeature() {
            return item.geometry;
        }
    };
};
const createLnLatSearchResult = (item) => {
    return {
        toOptionElement() {
            return html `Pointed location <at></at><em class="municipality">${truncate(item.lng)}, ${truncate(item.lat)}</em>`;
        },
        toDetailElement() {
            return html `
<citykleta-location .location=${item}>
    <span slot="title">Unknown place</span>
</citykleta-location>`;
        },
        toPoint() {
            return {
                lng: item.lng,
                lat: item.lat
            };
        },
        toString() {
            return `Pointed location at ${truncate(item.lng)},${truncate(item.lat)}`;
        },
        toGeoFeature() {
            return {
                type: 'Point',
                coordinates: [item.lng, item.lat]
            };
        }
    };
};
const createSearchResultInstance = (item) => {
    switch (item.type) {
        case 'corner':
            return createCornerSearchResult(item);
        case 'street_block':
            return createBlockSearchResult(item);
        case 'street':
            return createStreetSearchResult(item);
        case 'point_of_interest':
            return createPointOfInterestSearchResult(item);
        case 'lng_lat':
            return createLnLatSearchResult(item);
        default:
            throw new Error(`unknown search result type "${item.type}"`);
    }
};

const hasValue = p => p.item !== null;
const addItineraryPoint = (point, beforeId = null) => ({
    type: ActionType.ADD_ITINERARY_POINT,
    point,
    beforeId
});
const removeItineraryPoint = (id) => ({
    type: ActionType.REMOVE_ITINERARY_POINT,
    id
});
const updateItineraryPoint = (id, location) => ({
    type: ActionType.UPDATE_ITINERARY_POINT,
    id,
    location
});
const goTo = (location) => ({
    type: ActionType.GO_TO,
    location
});
const goFrom = (location) => ({
    type: ActionType.GO_FROM,
    location
});
const fetchRoutes = () => ({
    type: ActionType.FETCH_ROUTES
});
const fetchRoutesWithSuccess = (routes) => ({
    type: ActionType.FETCH_ROUTES_SUCCESS,
    routes
});
const selectRoute = (route) => ({
    type: ActionType.SELECT_ROUTE,
    route
});
const fetchRoutesWithFailure = (error) => ({
    type: ActionType.FETCH_ROUTES_FAILURE,
    error
});
const resetRoutes = () => ({
    type: ActionType.RESET_ROUTES
});
// thunks to handle side effects of stop points change
const eventuallyUpdateRoutes = (actionCreator) => (...args) => async (dispatch, getState) => {
    dispatch(actionCreator(...args));
    const stops = getState()
        .itinerary
        .stops
        .filter(hasValue);
    if (stops.length >= 2) {
        return dispatch(fetchRoutesFromAPI());
    }
};
var InsertionPosition;
(function (InsertionPosition) {
    InsertionPosition["BEFORE"] = "BEFORE";
    InsertionPosition["AFTER"] = "AFTER";
})(InsertionPosition || (InsertionPosition = {}));
const fetchRoutesFromAPI = () => async (dispatch, getState, API) => {
    const { directions } = API;
    dispatch(fetchRoutes());
    try {
        const { stops } = getState()
            .itinerary;
        const points = stops
            .filter(hasValue)
            .map(({ item }) => createSearchResultInstance(item).toPoint());
        const res = await directions.search(points);
        return dispatch(fetchRoutesWithSuccess(res));
    }
    catch (e) {
        return dispatch(fetchRoutesWithFailure(e));
    }
};
const moveItineraryPoint = (sourceId, targetId, position) => ({
    type: ActionType.MOVE_ITINERARY_POINT,
    sourceId,
    targetId,
    position
});
const addItineraryPointWithSideEffects = eventuallyUpdateRoutes(addItineraryPoint);
const removeItineraryPointWithSideEffects = eventuallyUpdateRoutes(removeItineraryPoint);
const changeItineraryPointWithSideEffects = eventuallyUpdateRoutes(updateItineraryPoint);
const moveItineraryPointWithSideEffects = eventuallyUpdateRoutes(moveItineraryPoint);

const defaultState = () => ({
    stops: [{
            id: 0,
            item: null
        }, {
            id: 1,
            item: null
        }],
    routes: [],
    selectedRoute: 0
});
const matchId = id => item => item.id === id;
const reducer = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.RESET_ROUTES: {
            return Object.assign({}, defaultState());
        }
        case ActionType.FETCH_ROUTES_SUCCESS: {
            const { routes } = action;
            return Object.assign({}, previousState, {
                routes,
                selectedRoute: 0
            });
        }
        case ActionType.SELECT_ROUTE: {
            const { route } = action;
            const { routes } = previousState;
            return route >= 0 && route < routes.length ?
                Object.assign({}, previousState, { selectedRoute: route }) :
                previousState;
        }
        case ActionType.UPDATE_ITINERARY_POINT: {
            const { id, location } = action;
            return Object.assign({}, previousState, {
                stops: previousState.stops.map(p => p.id !== id ? p : {
                    id,
                    item: Object.assign({}, p.item, location)
                })
            });
        }
        case ActionType.ADD_ITINERARY_POINT: {
            const { beforeId, point } = action;
            const newStops = [...previousState.stops];
            const beforeIndex = newStops.findIndex(p => p.id === beforeId);
            const insertIndex = beforeIndex >= 0 ? beforeIndex : newStops.length;
            const id = newStops.reduce((acc, curr) => Math.max(curr.id, acc), -1) + 1;
            const newPoint = { id, item: null };
            if (point) {
                newPoint.item = point;
            }
            newStops.splice(insertIndex, 0, newPoint);
            return Object.assign({}, previousState, {
                stops: newStops
            });
        }
        case ActionType.MOVE_ITINERARY_POINT: {
            const { stops } = previousState;
            const newStops = [...stops];
            const { sourceId, targetId, position } = action;
            const sourceItem = newStops.find(matchId(sourceId));
            const targetItem = newStops.find(matchId(targetId));
            if (sourceItem && targetItem) {
                const targetIndex = position === InsertionPosition.BEFORE ? newStops.indexOf(targetItem) : newStops.indexOf((targetItem)) + 1;
                newStops.splice(targetIndex, 0, Object.assign({}, sourceItem));
                const srcIndex = newStops.indexOf(sourceItem);
                newStops.splice(srcIndex, 1);
            }
            return Object.assign(previousState, { stops: newStops });
        }
        case ActionType.REMOVE_ITINERARY_POINT: {
            const { id } = action;
            return Object.assign({}, previousState, {
                stops: previousState.stops.reduce((prev, curr) => prev.concat(curr.id !== id ? [curr] : []), [])
            });
        }
        case ActionType.GO_TO: {
            const { location } = action;
            return Object.assign({}, previousState, {
                stops: [{
                        id: 0,
                        item: null
                    }, {
                        id: 1,
                        item: location
                    }],
                routes: []
            });
        }
        case ActionType.GO_FROM: {
            const { location } = action;
            return Object.assign({}, previousState, {
                stops: [{
                        id: 0,
                        item: location
                    }, {
                        id: 1,
                        item: null
                    }],
                routes: []
            });
        }
        default:
            return previousState;
    }
};

const defaultState$1 = () => ({
    searchResult: [],
    isSearching: false,
    selectedSearchResult: null
});
const reducer$1 = (previousState = defaultState$1(), action) => {
    switch (action.type) {
        case ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS:
            return Object.assign({}, previousState, {
                searchResult: action.pointsOfInterest.map((s, i) => Object.assign(s, {
                    id: i
                })),
                isSearching: false,
                selectedSearchResult: null
            });
        case ActionType.FETCH_POINTS_OF_INTEREST:
        case ActionType.FETCH_SEARCH_RESULT:
        case ActionType.FETCH_CLOSEST: {
            return Object.assign({}, previousState, {
                searchResult: [],
                isSearching: true,
                selectedSearchResult: null
            });
        }
        case ActionType.FETCH_CLOSEST_SUCCESS:
        case ActionType.FETCH_SEARCH_RESULT_SUCCESS:
            const { result: searchResult } = action;
            const selectedSearchResult = searchResult.length === 1 ? searchResult[0] : null;
            return Object.assign({}, previousState, {
                searchResult,
                isSearching: false,
                selectedSearchResult
            });
        case ActionType.FETCH_CLOSEST_FAILURE:
        case ActionType.FETCH_SEARCH_RESULT_FAILURE:
            return Object.assign({}, previousState, { isSearching: false });
        case ActionType.SELECT_SEARCH_RESULT:
            return Object.assign({}, previousState, {
                selectedSearchResult: action.searchResult
            });
        default:
            return previousState;
    }
};

var mapboxconf = Object.freeze({
    accessToken: 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw',
    style: 'http://localhost:8080/styles/osm-bright/style.json',
    center: [-82.367408, 23.122419],
    zoom: 12.4,
    minZoom: 11,
    doubleClickZoom: false,
    logoPosition: 'bottom-right'
});

const defaultState$2 = () => ({
    zoom: mapboxconf.zoom,
    center: mapboxconf.center
});
const reducer$2 = (previousState = defaultState$2(), action) => {
    switch (action.type) {
        case ActionType.UPDATE_MAP:
            const { type, ...rest } = action;
            const newState = Object.assign({}, previousState, rest);
            newState.zomm = truncate(newState.zoom, 2);
            newState.center = newState.center.map(v => truncate(v, 6));
            return newState;
        default:
            return previousState;
    }
};

const defaultState$3 = () => ({
    routes: [],
    isSearching: false,
    selectedRouteId: null
});
const reducer$3 = (previousState = defaultState$3(), action) => {
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
const defaultState$4 = () => ({
    selectedView: View.SEARCH
});
const reducer$4 = (previousState = defaultState$4(), action) => {
    switch (action.type) {
        case ActionType.SELECT_VIEW:
            return Object.assign({}, previousState, { selectedView: action.view });
        default:
            return previousState;
    }
};

const createReducer = (reducers) => {
    const combined = combineReducers(reducers);
    return (state = defaultState$5, action) => {
        if (action.type === ActionType.CHANGE_HISTORY_POINT) {
            return action.state;
        }
        return combined(state, action);
    };
};

const defaultState$5 = () => ({
    navigation: defaultState$4(),
    itinerary: defaultState(),
    search: defaultState$1(),
    settings: defaultState$6(),
    map: defaultState$2(),
    leisure: defaultState$3()
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
const store = (api = defaultAPI) => (initialState = defaultState$5()) => {
    const staticReducer = {
        navigation: reducer$4,
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
        let state = defaultState$5();
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
        return defaultState$5();
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

// codepen mit (todo search url)
const loadingIndicator = () => html `<svg version="1.1" width="100%" height="100%" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">
  <path opacity="0.2" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946
    s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634
    c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>
  <path d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0
    C22.32,8.481,24.301,9.057,26.013,10.047z">
    </path>
  </svg>`;
// grommet
const myLocation = () => html `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="none" stroke-width="2" d="M5,19 C7.209139,19 9,17.209139 9,15 C9,12.790861 7.209139,11 5,11 C2.790861,11 1,12.790861 1,15 C1,17.209139 2.790861,19 5,19 Z M19,19 C21.209139,19 23,17.209139 23,15 C23,12.790861 21.209139,11 19,11 C16.790861,11 15,12.790861 15,15 C15,17.209139 16.790861,19 19,19 Z M5,6 L10,6 M19,15 L16,5 L13,5 M9,9 L5,15 L12,15 C12,12 14,9 17,9 L16,9 L9,9 Z M9,9 L7,6"/>
</svg>`;
const plus = () => html `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="none" stroke-width="2" d="M12,22 L12,2 M2,12 L22,12"/>
</svg>
`;
const remove = () => html `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path d="M37.304 11.282l1.414 1.414-26.022 26.02-1.414-1.413z"/><path d="M12.696 11.282l26.022 26.02-1.414 1.415-26.022-26.02z"/></svg>`;
const dragHandle = () => html `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="none" stroke-width="2" d="M15,5 L17,5 L17,3 L15,3 L15,5 Z M7,5 L9,5 L9,3 L7,3 L7,5 Z M15,13 L17,13 L17,11 L15,11 L15,13 Z M7,13 L9,13 L9,11 L7,11 L7,13 Z M15,21 L17,21 L17,19 L15,19 L15,21 Z M7,21 L9,21 L9,19 L7,19 L7,21 Z"/>
</svg>`;
const swap = () => html `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M388.9 266.3c-5.1-5-5.2-13.3-.1-18.4L436 200H211c-7.2 0-13-5.8-13-13s5.8-13 13-13h224.9l-47.2-47.9c-5-5.1-5-13.3.1-18.4 5.1-5 13.3-5 18.4.1l69 70c1.1 1.2 2.1 2.5 2.7 4.1.7 1.6 1 3.3 1 5 0 3.4-1.3 6.6-3.7 9.1l-69 70c-5 5.2-13.2 5.3-18.3.3zM123.1 404.3c5.1-5 5.2-13.3.1-18.4L76.1 338H301c7.2 0 13-5.8 13-13s-5.8-13-13-13H76.1l47.2-47.9c5-5.1 5-13.3-.1-18.4-5.1-5-13.3-5-18.4.1l-69 70c-1.1 1.2-2.1 2.5-2.7 4.1-.7 1.6-1 3.3-1 5 0 3.4 1.3 6.6 3.7 9.1l69 70c5 5.2 13.2 5.3 18.3.3z"/></svg>`;

const initialState = deserialize(new URL(window.location.href));
var store$1 = store()(initialState);

export { fetchRoutesWithSuccess as A, fetchRoutesWithFailure as B, fetchRoutesFromAPI as C, moveItineraryPoint as D, defaultState as E, reducer$3 as F, defaultState$3 as G, mapboxconf as H, InsertionPosition as I, reducer$2 as J, View as V, storage as a, createSearchResultInstance as b, connect as c, addItineraryPointWithSideEffects as d, changeItineraryPointWithSideEffects as e, goFrom as f, goTo as g, resetRoutes as h, selectRoute as i, myLocation as j, reducer as k, loadingIndicator as l, moveItineraryPointWithSideEffects as m, reducer$1 as n, defaultState$1 as o, fromLine as p, swap as q, removeItineraryPointWithSideEffects as r, store$1 as s, plus as t, dragHandle as u, remove as v, addItineraryPoint as w, removeItineraryPoint as x, updateItineraryPoint as y, fetchRoutes as z };
//# sourceMappingURL=index-06166c4c.js.map
