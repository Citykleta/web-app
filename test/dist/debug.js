(function () {
  'use strict';

  const startTestMessage = (test, offset) => ({
      type: "TEST_START" /* TEST_START */,
      data: test,
      offset
  });
  const assertionMessage = (assertion, offset) => ({
      type: "ASSERTION" /* ASSERTION */,
      data: assertion,
      offset
  });
  const endTestMessage = (test, offset) => ({
      type: "TEST_END" /* TEST_END */,
      data: test,
      offset
  });
  const bailout = (error, offset) => ({
      type: "BAIL_OUT" /* BAIL_OUT */,
      data: error,
      offset
  });

  const delegateToCounter = (counter) => (target) => Object.defineProperties(target, {
      skipCount: {
          get() {
              return counter.skipCount;
          },
      },
      failureCount: {
          get() {
              return counter.failureCount;
          }
      },
      successCount: {
          get() {
              return counter.successCount;
          }
      },
      count: {
          get() {
              return counter.count;
          }
      }
  });
  const counter = () => {
      let success = 0;
      let failure = 0;
      let skip = 0;
      return Object.defineProperties({
          update(assertion) {
              const { pass, skip: isSkipped } = assertion;
              if (isSkipped) {
                  skip++;
              }
              else if (!isAssertionResult(assertion)) {
                  skip += assertion.skipCount;
                  success += assertion.successCount;
                  failure += assertion.failureCount;
              }
              else if (pass) {
                  success++;
              }
              else {
                  failure++;
              }
          }
      }, {
          successCount: {
              get() {
                  return success;
              }
          },
          failureCount: {
              get() {
                  return failure;
              }
          },
          skipCount: {
              get() {
                  return skip;
              }
          },
          count: {
              get() {
                  return skip + success + failure;
              }
          }
      });
  };

  const defaultTestOptions = Object.freeze({
      offset: 0,
      skip: false
  });
  const noop = () => {
  };
  const tester = (description, spec, { offset = 0, skip = false } = defaultTestOptions) => {
      let id = 0;
      let pass = true;
      let executionTime = 0;
      let error = null;
      const testCounter = counter();
      const withTestCounter = delegateToCounter(testCounter);
      const assertions = [];
      const collect = item => assertions.push(item);
      const specFunction = skip === true ? noop : function zora_spec_fn() {
          return spec(assert(collect, offset));
      };
      const testRoutine = (async function () {
          try {
              const start = Date.now();
              const result = await specFunction();
              executionTime = Date.now() - start;
              return result;
          }
          catch (e) {
              error = e;
          }
      })();
      return Object.defineProperties(withTestCounter({
          [Symbol.asyncIterator]: async function* () {
              await testRoutine;
              for (const assertion of assertions) {
                  assertion.id = ++id;
                  if (assertion[Symbol.asyncIterator]) {
                      // Sub test
                      yield startTestMessage({ description: assertion.description }, offset);
                      yield* assertion;
                      if (assertion.error !== null) {
                          // Bubble up the error and return
                          error = assertion.error;
                          pass = false;
                          return;
                      }
                  }
                  yield assertionMessage(assertion, offset);
                  pass = pass && assertion.pass;
                  testCounter.update(assertion);
              }
              return error !== null ?
                  yield bailout(error, offset) :
                  yield endTestMessage(this, offset);
          }
      }), {
          description: {
              enumerable: true,
              value: description
          },
          pass: {
              enumerable: true,
              get() {
                  return pass;
              }
          },
          executionTime: {
              enumerable: true,
              get() {
                  return executionTime;
              }
          },
          length: {
              get() {
                  return assertions.length;
              }
          },
          error: {
              get() {
                  return error;
              }
          },
          routine: {
              value: testRoutine
          },
          skip: {
              value: skip
          }
      });
  };

  var isArray = Array.isArray;
  var keyList = Object.keys;
  var hasProp = Object.prototype.hasOwnProperty;

  var fastDeepEqual = function equal(a, b) {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
      var arrA = isArray(a)
        , arrB = isArray(b)
        , i
        , length
        , key;

      if (arrA && arrB) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;)
          if (!equal(a[i], b[i])) return false;
        return true;
      }

      if (arrA != arrB) return false;

      var dateA = a instanceof Date
        , dateB = b instanceof Date;
      if (dateA != dateB) return false;
      if (dateA && dateB) return a.getTime() == b.getTime();

      var regexpA = a instanceof RegExp
        , regexpB = b instanceof RegExp;
      if (regexpA != regexpB) return false;
      if (regexpA && regexpB) return a.toString() == b.toString();

      var keys = keyList(a);
      length = keys.length;

      if (length !== keyList(b).length)
        return false;

      for (i = length; i-- !== 0;)
        if (!hasProp.call(b, keys[i])) return false;

      for (i = length; i-- !== 0;) {
        key = keys[i];
        if (!equal(a[key], b[key])) return false;
      }

      return true;
    }

    return a!==a && b!==b;
  };

  const isAssertionResult = (result) => {
      return 'operator' in result;
  };
  const specFnRegexp = /zora_spec_fn/;
  const nodeInternal = /node_modules\/.*|\(internal\/.*/;
  const getAssertionLocation = () => {
      const err = new Error();
      const stack = (err.stack || '')
          .split('\n')
          .filter(l => !nodeInternal.test(l) && l !== '');
      const userLandIndex = stack.findIndex(l => specFnRegexp.test(l));
      return (userLandIndex >= 1 ?
          stack[userLandIndex - 1] : (stack[stack.length - 1] || 'N/A'))
          .trim()
          .replace(/^at|^@/, '');
  };
  const assertMethodHook = (fn) => function (...args) {
      // @ts-ignore
      return this.collect(fn(...args));
  };
  const aliasMethodHook = (methodName) => function (...args) {
      return this[methodName](...args);
  };
  const AssertPrototype = {
      equal: assertMethodHook((actual, expected, description = 'should be equivalent') => ({
          pass: fastDeepEqual(actual, expected),
          actual,
          expected,
          description,
          operator: "equal" /* EQUAL */
      })),
      equals: aliasMethodHook('equal'),
      eq: aliasMethodHook('equal'),
      deepEqual: aliasMethodHook('equal'),
      notEqual: assertMethodHook((actual, expected, description = 'should not be equivalent') => ({
          pass: !fastDeepEqual(actual, expected),
          actual,
          expected,
          description,
          operator: "notEqual" /* NOT_EQUAL */
      })),
      notEquals: aliasMethodHook('notEqual'),
      notEq: aliasMethodHook('notEqual'),
      notDeepEqual: aliasMethodHook('notEqual'),
      is: assertMethodHook((actual, expected, description = 'should be the same') => ({
          pass: Object.is(actual, expected),
          actual,
          expected,
          description,
          operator: "is" /* IS */
      })),
      same: aliasMethodHook('is'),
      isNot: assertMethodHook((actual, expected, description = 'should not be the same') => ({
          pass: !Object.is(actual, expected),
          actual,
          expected,
          description,
          operator: "isNot" /* IS_NOT */
      })),
      notSame: aliasMethodHook('isNot'),
      ok: assertMethodHook((actual, description = 'should be truthy') => ({
          pass: Boolean(actual),
          actual,
          expected: 'truthy value',
          description,
          operator: "ok" /* OK */
      })),
      truthy: aliasMethodHook('ok'),
      notOk: assertMethodHook((actual, description = 'should be falsy') => ({
          pass: !Boolean(actual),
          actual,
          expected: 'falsy value',
          description,
          operator: "notOk" /* NOT_OK */
      })),
      falsy: aliasMethodHook('notOk'),
      fail: assertMethodHook((description = 'fail called') => ({
          pass: false,
          actual: 'fail called',
          expected: 'fail not called',
          description,
          operator: "fail" /* FAIL */
      })),
      throws: assertMethodHook((func, expected, description) => {
          let caught;
          let pass;
          let actual;
          if (typeof expected === 'string') {
              [expected, description] = [description, expected];
          }
          try {
              func();
          }
          catch (err) {
              caught = { error: err };
          }
          pass = caught !== undefined;
          actual = caught && caught.error;
          if (expected instanceof RegExp) {
              pass = expected.test(actual) || expected.test(actual && actual.message);
              actual = actual && actual.message || actual;
              expected = String(expected);
          }
          else if (typeof expected === 'function' && caught) {
              pass = actual instanceof expected;
              actual = actual.constructor;
          }
          return {
              pass,
              actual,
              expected,
              description: description || 'should throw',
              operator: "throws" /* THROWS */,
          };
      }),
      doesNotThrow: assertMethodHook((func, expected, description) => {
          let caught;
          if (typeof expected === 'string') {
              [expected, description] = [description, expected];
          }
          try {
              func();
          }
          catch (err) {
              caught = { error: err };
          }
          return {
              pass: caught === undefined,
              expected: 'no thrown error',
              actual: caught && caught.error,
              operator: "doesNotThrow" /* DOES_NOT_THROW */,
              description: description || 'should not throw'
          };
      })
  };
  const assert = (collect, offset) => {
      const actualCollect = item => {
          if (!item.pass) {
              item.at = getAssertionLocation();
          }
          collect(item);
          return item;
      };
      return Object.assign(Object.create(AssertPrototype, { collect: { value: actualCollect } }), {
          test(description, spec, opts = defaultTestOptions) {
              const subTest = tester(description, spec, Object.assign({}, defaultTestOptions, opts, { offset: offset + 1 }));
              collect(subTest);
              return subTest.routine;
          },
          skip(description, spec = noop, opts = defaultTestOptions) {
              return this.test(description, spec, Object.assign({}, opts, { skip: true }));
          }
      });
  };

  // with two arguments
  const curry = (fn) => (a, b) => b === void 0 ? b => fn(a, b) : fn(a, b);
  const toCurriedIterable = gen => curry((a, b) => ({
      [Symbol.asyncIterator]() {
          return gen(a, b);
      }
  }));

  const map = toCurriedIterable(async function* (fn, asyncIterable) {
      let index = 0;
      for await (const i of asyncIterable) {
          yield fn(i, index, asyncIterable);
          index++;
      }
  });

  const filter = toCurriedIterable(async function* (fn, asyncIterable) {
      let index = 0;
      for await (const i of asyncIterable) {
          if (fn(i, index, asyncIterable) === true) {
              yield i;
          }
          index++;
      }
  });

  const print = (message, offset = 0) => {
      console.log(message.padStart(message.length + (offset * 4))); // 4 white space used as indent (see tap-parser)
  };
  const stringifySymbol = (key, value) => {
      if (typeof value === 'symbol') {
          return value.toString();
      }
      return value;
  };
  const printYAML = (obj, offset = 0) => {
      const YAMLOffset = offset + 0.5;
      print('---', YAMLOffset);
      for (const [prop, value] of Object.entries(obj)) {
          print(`${prop}: ${JSON.stringify(stringifySymbol(null, value), stringifySymbol)}`, YAMLOffset + 0.5);
      }
      print('...', YAMLOffset);
  };
  const comment = (value, offset) => {
      print(`# ${value}`, offset);
  };
  const subTestPrinter = (prefix = '') => (message) => {
      const { data } = message;
      const value = `${prefix}${data.description}`;
      comment(value, message.offset);
  };
  const mochaTapSubTest = subTestPrinter('Subtest: ');
  const tapeSubTest = subTestPrinter();
  const assertPrinter = (diagnostic) => (message) => {
      const { data, offset } = message;
      const { pass, description, id } = data;
      const label = pass === true ? 'ok' : 'not ok';
      if (isAssertionResult(data)) {
          print(`${label} ${id} - ${description}`, offset);
          if (pass === false) {
              printYAML(diagnostic(data), offset);
          }
      }
      else {
          const comment = data.skip === true ? 'SKIP' : `${data.executionTime}ms`;
          print(`${pass ? 'ok' : 'not ok'} ${id} - ${description} # ${comment}`, message.offset);
      }
  };
  const tapeAssert = assertPrinter(({ id, pass, description, ...rest }) => rest);
  const mochaTapAssert = assertPrinter(({ expected, id, pass, description, actual, operator, at, ...rest }) => ({
      wanted: expected,
      found: actual,
      at,
      operator,
      ...rest
  }));
  const testEnd = (message) => {
      const length = message.data.length;
      const { offset } = message;
      print(`1..${length}`, offset);
  };
  const printBailout = (message) => {
      print('Bail out! Unhandled error.');
  };
  const reportAsMochaTap = (message) => {
      switch (message.type) {
          case "TEST_START" /* TEST_START */:
              mochaTapSubTest(message);
              break;
          case "ASSERTION" /* ASSERTION */:
              mochaTapAssert(message);
              break;
          case "TEST_END" /* TEST_END */:
              testEnd(message);
              break;
          case "BAIL_OUT" /* BAIL_OUT */:
              printBailout();
              throw message.data;
      }
  };
  const reportAsTapeTap = (message) => {
      switch (message.type) {
          case "TEST_START" /* TEST_START */:
              tapeSubTest(message);
              break;
          case "ASSERTION" /* ASSERTION */:
              tapeAssert(message);
              break;
          case "BAIL_OUT" /* BAIL_OUT */:
              printBailout();
              throw message.data;
      }
  };
  const flatFilter = filter((message) => {
      return message.type === "TEST_START" /* TEST_START */
          || message.type === "BAIL_OUT" /* BAIL_OUT */
          || (message.type === "ASSERTION" /* ASSERTION */ && (isAssertionResult(message.data) || message.data.skip === true));
  });
  const flattenStream = (stream) => {
      let id = 0;
      const mapper = map(message => {
          if (message.type === "ASSERTION" /* ASSERTION */) {
              const mappedData = Object.assign(message.data, { id: ++id });
              return assertionMessage(mappedData, 0);
          }
          return Object.assign({}, message, { offset: 0 });
      });
      return mapper(flatFilter(stream));
  };
  const printSummary = (harness) => {
      print('', 0);
      comment(harness.pass ? 'ok' : 'not ok', 0);
      comment(`success: ${harness.successCount}`, 0);
      comment(`skipped: ${harness.skipCount}`, 0);
      comment(`failure: ${harness.failureCount}`, 0);
  };
  const tapeTapLike = async (stream) => {
      print('TAP version 13');
      const streamInstance = flattenStream(stream);
      for await (const message of streamInstance) {
          reportAsTapeTap(message);
      }
      print(`1..${stream.count}`, 0);
      printSummary(stream);
  };
  const mochaTapLike = async (stream) => {
      print('TAP version 13');
      for await (const message of stream) {
          reportAsMochaTap(message);
      }
      printSummary(stream);
  };

  const harnessFactory = () => {
      const tests = [];
      const testCounter = counter();
      const withTestCounter = delegateToCounter(testCounter);
      const rootOffset = 0;
      const collect = item => tests.push(item);
      const api = assert(collect, rootOffset);
      let pass = true;
      let id = 0;
      const instance = Object.create(api, {
          length: {
              get() {
                  return tests.length;
              }
          },
          pass: {
              get() {
                  return pass;
              }
          }
      });
      return withTestCounter(Object.assign(instance, {
          [Symbol.asyncIterator]: async function* () {
              for (const t of tests) {
                  t.id = ++id;
                  if (t[Symbol.asyncIterator]) {
                      // Sub test
                      yield startTestMessage({ description: t.description }, rootOffset);
                      yield* t;
                      if (t.error !== null) {
                          pass = false;
                          return;
                      }
                  }
                  yield assertionMessage(t, rootOffset);
                  pass = pass && t.pass;
                  testCounter.update(t);
              }
              yield endTestMessage(this, 0);
          },
          report: async (reporter = tapeTapLike) => {
              return reporter(instance);
          }
      }));
  };

  let autoStart = true;
  let indent = false;
  const defaultTestHarness = harnessFactory();
  const rootTest = defaultTestHarness.test.bind(defaultTestHarness);
  rootTest.indent = () => indent = true;
  const test = rootTest;
  const skip = (description, spec, options = {}) => rootTest(description, spec, Object.assign({}, options, { skip: true }));
  rootTest.skip = skip;
  const equal = defaultTestHarness.equal.bind(defaultTestHarness);
  const notEqual = defaultTestHarness.notEqual.bind(defaultTestHarness);
  const is = defaultTestHarness.is.bind(defaultTestHarness);
  const isNot = defaultTestHarness.isNot.bind(defaultTestHarness);
  const ok = defaultTestHarness.ok.bind(defaultTestHarness);
  const notOk = defaultTestHarness.notOk.bind(defaultTestHarness);
  const fail = defaultTestHarness.fail.bind(defaultTestHarness);
  const throws = defaultTestHarness.throws.bind(defaultTestHarness);
  const doesNotThrow = defaultTestHarness.doesNotThrow.bind(defaultTestHarness);
  const start = () => {
      if (autoStart) {
          defaultTestHarness.report(indent ? mochaTapLike : tapeTapLike);
      }
  };
  // on next tick start reporting
  // @ts-ignore
  if (typeof window === 'undefined') {
      setTimeout(start, 0);
  }
  else {
      // @ts-ignore
      window.addEventListener('load', start);
  }

  var ActionType;
  (function (ActionType) {
      ActionType["MOVE_ITINERARY_POINT"] = "MOVE_ITINERARY_POINT";
      ActionType["ADD_ITINERARY_POINT"] = "ADD_ITINERARY_POINT";
      ActionType["UPDATE_ITINERARY_POINT"] = "UPDATE_ITINERARY_POINT";
      ActionType["REMOVE_ITINERARY_POINT"] = "REMOVE_ITINERARY_POINT";
      ActionType["GO_TO"] = "GO_TO";
      ActionType["GO_FROM"] = "GO_FROM";
      ActionType["FETCH_ROUTES"] = "FETCH_ROUTES";
      ActionType["FETCH_ROUTES_SUCCESS"] = "FETCH_ROUTES_SUCCESS";
      ActionType["FETCH_ROUTES_FAILURE"] = "FETCH_ROUTES_FAILURE";
      ActionType["SELECT_ROUTE"] = "SELECT_ROUTE";
      ActionType["RESET_ROUTES"] = "RESET_ROUTES";
      ActionType["FETCH_POINTS_OF_INTEREST"] = "FETCH_POINTS_OF_INTEREST";
      ActionType["FETCH_POINTS_OF_INTEREST_SUCCESS"] = "FETCH_POINTS_OF_INTEREST_SUCCESS";
      ActionType["FETCH_POINTS_OF_INTEREST_FAILURE"] = "FETCH_POINTS_OF_INTEREST_FAILURE";
      ActionType["FETCH_SEARCH_RESULT"] = "FETCH_SEARCH_RESULT";
      ActionType["FETCH_SEARCH_RESULT_SUCCESS"] = "FETCH_SEARCH_RESULT_SUCCESS";
      ActionType["FETCH_SEARCH_RESULT_FAILURE"] = "FETCH_SEARCH_RESULT_FAILURE";
      ActionType["FETCH_CLOSEST"] = "FETCH_CLOSEST";
      ActionType["FETCH_CLOSEST_SUCCESS"] = "FETCH_CLOSEST_SUCCESS";
      ActionType["FETCH_CLOSEST_FAILURE"] = "FETCH_CLOSEST_FAILURE";
      ActionType["FETCH_LEISURE_ROUTES"] = "FETCH_LEISURE_ROUTES";
      ActionType["FETCH_LEISURE_ROUTES_SUCCESS"] = "FETCH_LEISURE_ROUTES_SUCCESS";
      ActionType["FETCH_LEISURE_ROUTES_FAILURE"] = "FETCH_LEISURE_ROUTES_FAILURE";
      ActionType["SELECT_LEISURE_ROUTE"] = "SELECT_LEISURE_ROUTE";
      ActionType["SELECT_SEARCH_RESULT"] = "SELECT_SEARCH_RESULT";
      ActionType["CHANGE_THEME"] = "CHANGE_THEME";
      ActionType["UPDATE_MAP"] = "UPDATE_MAP";
      ActionType["SELECT_VIEW"] = "SELECT_VIEW";
      ActionType["CHANGE_HISTORY_POINT"] = "CHANGE_HISTORY_POINT";
  })(ActionType || (ActionType = {}));
  const changeHistoryPoint = (state) => ({
      type: ActionType.CHANGE_HISTORY_POINT,
      state
  });

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var polyline_1 = createCommonjsModule(function (module) {

  /**
   * Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
   *
   * Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
   * by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)
   *
   * @module polyline
   */

  var polyline = {};

  function py2_round(value) {
      // Google's polyline algorithm uses the same rounding strategy as Python 2, which is different from JS for negative values
      return Math.floor(Math.abs(value) + 0.5) * (value >= 0 ? 1 : -1);
  }

  function encode(current, previous, factor) {
      current = py2_round(current * factor);
      previous = py2_round(previous * factor);
      var coordinate = current - previous;
      coordinate <<= 1;
      if (current - previous < 0) {
          coordinate = ~coordinate;
      }
      var output = '';
      while (coordinate >= 0x20) {
          output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
          coordinate >>= 5;
      }
      output += String.fromCharCode(coordinate + 63);
      return output;
  }

  /**
   * Decodes to a [latitude, longitude] coordinates array.
   *
   * This is adapted from the implementation in Project-OSRM.
   *
   * @param {String} str
   * @param {Number} precision
   * @returns {Array}
   *
   * @see https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
   */
  polyline.decode = function(str, precision) {
      var index = 0,
          lat = 0,
          lng = 0,
          coordinates = [],
          shift = 0,
          result = 0,
          byte = null,
          latitude_change,
          longitude_change,
          factor = Math.pow(10, Number.isInteger(precision) ? precision : 5);

      // Coordinates have variable length when encoded, so just keep
      // track of whether we've hit the end of the string. In each
      // loop iteration, a single coordinate is decoded.
      while (index < str.length) {

          // Reset shift, result, and byte
          byte = null;
          shift = 0;
          result = 0;

          do {
              byte = str.charCodeAt(index++) - 63;
              result |= (byte & 0x1f) << shift;
              shift += 5;
          } while (byte >= 0x20);

          latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

          shift = result = 0;

          do {
              byte = str.charCodeAt(index++) - 63;
              result |= (byte & 0x1f) << shift;
              shift += 5;
          } while (byte >= 0x20);

          longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

          lat += latitude_change;
          lng += longitude_change;

          coordinates.push([lat / factor, lng / factor]);
      }

      return coordinates;
  };

  /**
   * Encodes the given [latitude, longitude] coordinates array.
   *
   * @param {Array.<Array.<Number>>} coordinates
   * @param {Number} precision
   * @returns {String}
   */
  polyline.encode = function(coordinates, precision) {
      if (!coordinates.length) { return ''; }

      var factor = Math.pow(10, Number.isInteger(precision) ? precision : 5),
          output = encode(coordinates[0][0], 0, factor) + encode(coordinates[0][1], 0, factor);

      for (var i = 1; i < coordinates.length; i++) {
          var a = coordinates[i], b = coordinates[i - 1];
          output += encode(a[0], b[0], factor);
          output += encode(a[1], b[1], factor);
      }

      return output;
  };

  function flipped(coords) {
      var flipped = [];
      for (var i = 0; i < coords.length; i++) {
          flipped.push(coords[i].slice().reverse());
      }
      return flipped;
  }

  /**
   * Encodes a GeoJSON LineString feature/geometry.
   *
   * @param {Object} geojson
   * @param {Number} precision
   * @returns {String}
   */
  polyline.fromGeoJSON = function(geojson, precision) {
      if (geojson && geojson.type === 'Feature') {
          geojson = geojson.geometry;
      }
      if (!geojson || geojson.type !== 'LineString') {
          throw new Error('Input must be a GeoJSON LineString');
      }
      return polyline.encode(flipped(geojson.coordinates), precision);
  };

  /**
   * Decodes to a GeoJSON LineString geometry.
   *
   * @param {String} str
   * @param {Number} precision
   * @returns {Object}
   */
  polyline.toGeoJSON = function(str, precision) {
      var coords = polyline.decode(str, precision);
      return {
          type: 'LineString',
          coordinates: flipped(coords)
      };
  };

  if ( module.exports) {
      module.exports = polyline;
  }
  });

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  const directives = new WeakMap();
  const isDirective = (o) => {
      return typeof o === 'function' && directives.has(o);
  };
  //# sourceMappingURL=directive.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * True if the custom elements polyfill is in use.
   */
  const isCEPolyfill = window.customElements !== undefined &&
      window.customElements.polyfillWrapFlushCallback !==
          undefined;
  /**
   * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
   * `container`.
   */
  const removeNodes = (container, start, end = null) => {
      while (start !== end) {
          const n = start.nextSibling;
          container.removeChild(start);
          start = n;
      }
  };
  //# sourceMappingURL=dom.js.map

  /**
   * @license
   * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * A sentinel value that signals that a value was handled by a directive and
   * should not be written to the DOM.
   */
  const noChange = {};
  /**
   * A sentinel value that signals a NodePart to fully clear its content.
   */
  const nothing = {};
  //# sourceMappingURL=part.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * An expression marker with embedded unique key to avoid collision with
   * possible text in templates.
   */
  const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
  /**
   * An expression marker used text-positions, multi-binding attributes, and
   * attributes with markup-like text values.
   */
  const nodeMarker = `<!--${marker}-->`;
  /**
   * Suffix appended to all bound attribute names.
   */
  const boundAttributeSuffix = '$lit$';
  const isTemplatePartActive = (part) => part.index !== -1;
  // Allows `document.createComment('')` to be renamed for a
  // small manual size-savings.
  const createMarker = () => document.createComment('');
  /**
   * This regex extracts the attribute name preceding an attribute-position
   * expression. It does this by matching the syntax allowed for attributes
   * against the string literal directly preceding the expression, assuming that
   * the expression is in an attribute-value position.
   *
   * See attributes in the HTML spec:
   * https://www.w3.org/TR/html5/syntax.html#elements-attributes
   *
   * " \x09\x0a\x0c\x0d" are HTML space characters:
   * https://www.w3.org/TR/html5/infrastructure.html#space-characters
   *
   * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
   * space character except " ".
   *
   * So an attribute is:
   *  * The name: any character except a control character, space character, ('),
   *    ("), ">", "=", or "/"
   *  * Followed by zero or more space characters
   *  * Followed by "="
   *  * Followed by zero or more space characters
   *  * Followed by:
   *    * Any character except space, ('), ("), "<", ">", "=", (`), or
   *    * (") then any non-("), or
   *    * (') then any non-(')
   */
  const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;
  //# sourceMappingURL=template.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * An instance of a `Template` that can be attached to the DOM and updated
   * with new values.
   */
  class TemplateInstance {
      constructor(template, processor, options) {
          this.__parts = [];
          this.template = template;
          this.processor = processor;
          this.options = options;
      }
      update(values) {
          let i = 0;
          for (const part of this.__parts) {
              if (part !== undefined) {
                  part.setValue(values[i]);
              }
              i++;
          }
          for (const part of this.__parts) {
              if (part !== undefined) {
                  part.commit();
              }
          }
      }
      _clone() {
          // There are a number of steps in the lifecycle of a template instance's
          // DOM fragment:
          //  1. Clone - create the instance fragment
          //  2. Adopt - adopt into the main document
          //  3. Process - find part markers and create parts
          //  4. Upgrade - upgrade custom elements
          //  5. Update - set node, attribute, property, etc., values
          //  6. Connect - connect to the document. Optional and outside of this
          //     method.
          //
          // We have a few constraints on the ordering of these steps:
          //  * We need to upgrade before updating, so that property values will pass
          //    through any property setters.
          //  * We would like to process before upgrading so that we're sure that the
          //    cloned fragment is inert and not disturbed by self-modifying DOM.
          //  * We want custom elements to upgrade even in disconnected fragments.
          //
          // Given these constraints, with full custom elements support we would
          // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
          //
          // But Safari dooes not implement CustomElementRegistry#upgrade, so we
          // can not implement that order and still have upgrade-before-update and
          // upgrade disconnected fragments. So we instead sacrifice the
          // process-before-upgrade constraint, since in Custom Elements v1 elements
          // must not modify their light DOM in the constructor. We still have issues
          // when co-existing with CEv0 elements like Polymer 1, and with polyfills
          // that don't strictly adhere to the no-modification rule because shadow
          // DOM, which may be created in the constructor, is emulated by being placed
          // in the light DOM.
          //
          // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
          // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
          // in one step.
          //
          // The Custom Elements v1 polyfill supports upgrade(), so the order when
          // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
          // Connect.
          const fragment = isCEPolyfill ?
              this.template.element.content.cloneNode(true) :
              document.importNode(this.template.element.content, true);
          const stack = [];
          const parts = this.template.parts;
          // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
          const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
          let partIndex = 0;
          let nodeIndex = 0;
          let part;
          let node = walker.nextNode();
          // Loop through all the nodes and parts of a template
          while (partIndex < parts.length) {
              part = parts[partIndex];
              if (!isTemplatePartActive(part)) {
                  this.__parts.push(undefined);
                  partIndex++;
                  continue;
              }
              // Progress the tree walker until we find our next part's node.
              // Note that multiple parts may share the same node (attribute parts
              // on a single element), so this loop may not run at all.
              while (nodeIndex < part.index) {
                  nodeIndex++;
                  if (node.nodeName === 'TEMPLATE') {
                      stack.push(node);
                      walker.currentNode = node.content;
                  }
                  if ((node = walker.nextNode()) === null) {
                      // We've exhausted the content inside a nested template element.
                      // Because we still have parts (the outer for-loop), we know:
                      // - There is a template in the stack
                      // - The walker will find a nextNode outside the template
                      walker.currentNode = stack.pop();
                      node = walker.nextNode();
                  }
              }
              // We've arrived at our part's node.
              if (part.type === 'node') {
                  const part = this.processor.handleTextExpression(this.options);
                  part.insertAfterNode(node.previousSibling);
                  this.__parts.push(part);
              }
              else {
                  this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
              }
              partIndex++;
          }
          if (isCEPolyfill) {
              document.adoptNode(fragment);
              customElements.upgrade(fragment);
          }
          return fragment;
      }
  }
  //# sourceMappingURL=template-instance.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  const commentMarker = ` ${marker} `;
  /**
   * The return type of `html`, which holds a Template and the values from
   * interpolated expressions.
   */
  class TemplateResult {
      constructor(strings, values, type, processor) {
          this.strings = strings;
          this.values = values;
          this.type = type;
          this.processor = processor;
      }
      /**
       * Returns a string of HTML used to create a `<template>` element.
       */
      getHTML() {
          const l = this.strings.length - 1;
          let html = '';
          let isCommentBinding = false;
          for (let i = 0; i < l; i++) {
              const s = this.strings[i];
              // For each binding we want to determine the kind of marker to insert
              // into the template source before it's parsed by the browser's HTML
              // parser. The marker type is based on whether the expression is in an
              // attribute, text, or comment poisition.
              //   * For node-position bindings we insert a comment with the marker
              //     sentinel as its text content, like <!--{{lit-guid}}-->.
              //   * For attribute bindings we insert just the marker sentinel for the
              //     first binding, so that we support unquoted attribute bindings.
              //     Subsequent bindings can use a comment marker because multi-binding
              //     attributes must be quoted.
              //   * For comment bindings we insert just the marker sentinel so we don't
              //     close the comment.
              //
              // The following code scans the template source, but is *not* an HTML
              // parser. We don't need to track the tree structure of the HTML, only
              // whether a binding is inside a comment, and if not, if it appears to be
              // the first binding in an attribute.
              const commentOpen = s.lastIndexOf('<!--');
              // We're in comment position if we have a comment open with no following
              // comment close. Because <-- can appear in an attribute value there can
              // be false positives.
              isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                  s.indexOf('-->', commentOpen + 1) === -1;
              // Check to see if we have an attribute-like sequence preceeding the
              // expression. This can match "name=value" like structures in text,
              // comments, and attribute values, so there can be false-positives.
              const attributeMatch = lastAttributeNameRegex.exec(s);
              if (attributeMatch === null) {
                  // We're only in this branch if we don't have a attribute-like
                  // preceeding sequence. For comments, this guards against unusual
                  // attribute values like <div foo="<!--${'bar'}">. Cases like
                  // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                  // below.
                  html += s + (isCommentBinding ? commentMarker : nodeMarker);
              }
              else {
                  // For attributes we use just a marker sentinel, and also append a
                  // $lit$ suffix to the name to opt-out of attribute-specific parsing
                  // that IE and Edge do for style and certain SVG attributes.
                  html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                      attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                      marker;
              }
          }
          html += this.strings[l];
          return html;
      }
      getTemplateElement() {
          const template = document.createElement('template');
          template.innerHTML = this.getHTML();
          return template;
      }
  }
  //# sourceMappingURL=template-result.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  const isPrimitive = (value) => {
      return (value === null ||
          !(typeof value === 'object' || typeof value === 'function'));
  };
  const isIterable = (value) => {
      return Array.isArray(value) ||
          // tslint:disable-next-line:no-any
          !!(value && value[Symbol.iterator]);
  };
  /**
   * Writes attribute values to the DOM for a group of AttributeParts bound to a
   * single attibute. The value is only set once even if there are multiple parts
   * for an attribute.
   */
  class AttributeCommitter {
      constructor(element, name, strings) {
          this.dirty = true;
          this.element = element;
          this.name = name;
          this.strings = strings;
          this.parts = [];
          for (let i = 0; i < strings.length - 1; i++) {
              this.parts[i] = this._createPart();
          }
      }
      /**
       * Creates a single part. Override this to create a differnt type of part.
       */
      _createPart() {
          return new AttributePart(this);
      }
      _getValue() {
          const strings = this.strings;
          const l = strings.length - 1;
          let text = '';
          for (let i = 0; i < l; i++) {
              text += strings[i];
              const part = this.parts[i];
              if (part !== undefined) {
                  const v = part.value;
                  if (isPrimitive(v) || !isIterable(v)) {
                      text += typeof v === 'string' ? v : String(v);
                  }
                  else {
                      for (const t of v) {
                          text += typeof t === 'string' ? t : String(t);
                      }
                  }
              }
          }
          text += strings[l];
          return text;
      }
      commit() {
          if (this.dirty) {
              this.dirty = false;
              this.element.setAttribute(this.name, this._getValue());
          }
      }
  }
  /**
   * A Part that controls all or part of an attribute value.
   */
  class AttributePart {
      constructor(committer) {
          this.value = undefined;
          this.committer = committer;
      }
      setValue(value) {
          if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
              this.value = value;
              // If the value is a not a directive, dirty the committer so that it'll
              // call setAttribute. If the value is a directive, it'll dirty the
              // committer if it calls setValue().
              if (!isDirective(value)) {
                  this.committer.dirty = true;
              }
          }
      }
      commit() {
          while (isDirective(this.value)) {
              const directive = this.value;
              this.value = noChange;
              directive(this);
          }
          if (this.value === noChange) {
              return;
          }
          this.committer.commit();
      }
  }
  /**
   * A Part that controls a location within a Node tree. Like a Range, NodePart
   * has start and end locations and can set and update the Nodes between those
   * locations.
   *
   * NodeParts support several value types: primitives, Nodes, TemplateResults,
   * as well as arrays and iterables of those types.
   */
  class NodePart {
      constructor(options) {
          this.value = undefined;
          this.__pendingValue = undefined;
          this.options = options;
      }
      /**
       * Appends this part into a container.
       *
       * This part must be empty, as its contents are not automatically moved.
       */
      appendInto(container) {
          this.startNode = container.appendChild(createMarker());
          this.endNode = container.appendChild(createMarker());
      }
      /**
       * Inserts this part after the `ref` node (between `ref` and `ref`'s next
       * sibling). Both `ref` and its next sibling must be static, unchanging nodes
       * such as those that appear in a literal section of a template.
       *
       * This part must be empty, as its contents are not automatically moved.
       */
      insertAfterNode(ref) {
          this.startNode = ref;
          this.endNode = ref.nextSibling;
      }
      /**
       * Appends this part into a parent part.
       *
       * This part must be empty, as its contents are not automatically moved.
       */
      appendIntoPart(part) {
          part.__insert(this.startNode = createMarker());
          part.__insert(this.endNode = createMarker());
      }
      /**
       * Inserts this part after the `ref` part.
       *
       * This part must be empty, as its contents are not automatically moved.
       */
      insertAfterPart(ref) {
          ref.__insert(this.startNode = createMarker());
          this.endNode = ref.endNode;
          ref.endNode = this.startNode;
      }
      setValue(value) {
          this.__pendingValue = value;
      }
      commit() {
          while (isDirective(this.__pendingValue)) {
              const directive = this.__pendingValue;
              this.__pendingValue = noChange;
              directive(this);
          }
          const value = this.__pendingValue;
          if (value === noChange) {
              return;
          }
          if (isPrimitive(value)) {
              if (value !== this.value) {
                  this.__commitText(value);
              }
          }
          else if (value instanceof TemplateResult) {
              this.__commitTemplateResult(value);
          }
          else if (value instanceof Node) {
              this.__commitNode(value);
          }
          else if (isIterable(value)) {
              this.__commitIterable(value);
          }
          else if (value === nothing) {
              this.value = nothing;
              this.clear();
          }
          else {
              // Fallback, will render the string representation
              this.__commitText(value);
          }
      }
      __insert(node) {
          this.endNode.parentNode.insertBefore(node, this.endNode);
      }
      __commitNode(value) {
          if (this.value === value) {
              return;
          }
          this.clear();
          this.__insert(value);
          this.value = value;
      }
      __commitText(value) {
          const node = this.startNode.nextSibling;
          value = value == null ? '' : value;
          // If `value` isn't already a string, we explicitly convert it here in case
          // it can't be implicitly converted - i.e. it's a symbol.
          const valueAsString = typeof value === 'string' ? value : String(value);
          if (node === this.endNode.previousSibling &&
              node.nodeType === 3 /* Node.TEXT_NODE */) {
              // If we only have a single text node between the markers, we can just
              // set its value, rather than replacing it.
              // TODO(justinfagnani): Can we just check if this.value is primitive?
              node.data = valueAsString;
          }
          else {
              this.__commitNode(document.createTextNode(valueAsString));
          }
          this.value = value;
      }
      __commitTemplateResult(value) {
          const template = this.options.templateFactory(value);
          if (this.value instanceof TemplateInstance &&
              this.value.template === template) {
              this.value.update(value.values);
          }
          else {
              // Make sure we propagate the template processor from the TemplateResult
              // so that we use its syntax extension, etc. The template factory comes
              // from the render function options so that it can control template
              // caching and preprocessing.
              const instance = new TemplateInstance(template, value.processor, this.options);
              const fragment = instance._clone();
              instance.update(value.values);
              this.__commitNode(fragment);
              this.value = instance;
          }
      }
      __commitIterable(value) {
          // For an Iterable, we create a new InstancePart per item, then set its
          // value to the item. This is a little bit of overhead for every item in
          // an Iterable, but it lets us recurse easily and efficiently update Arrays
          // of TemplateResults that will be commonly returned from expressions like:
          // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
          // If _value is an array, then the previous render was of an
          // iterable and _value will contain the NodeParts from the previous
          // render. If _value is not an array, clear this part and make a new
          // array for NodeParts.
          if (!Array.isArray(this.value)) {
              this.value = [];
              this.clear();
          }
          // Lets us keep track of how many items we stamped so we can clear leftover
          // items from a previous render
          const itemParts = this.value;
          let partIndex = 0;
          let itemPart;
          for (const item of value) {
              // Try to reuse an existing part
              itemPart = itemParts[partIndex];
              // If no existing part, create a new one
              if (itemPart === undefined) {
                  itemPart = new NodePart(this.options);
                  itemParts.push(itemPart);
                  if (partIndex === 0) {
                      itemPart.appendIntoPart(this);
                  }
                  else {
                      itemPart.insertAfterPart(itemParts[partIndex - 1]);
                  }
              }
              itemPart.setValue(item);
              itemPart.commit();
              partIndex++;
          }
          if (partIndex < itemParts.length) {
              // Truncate the parts array so _value reflects the current state
              itemParts.length = partIndex;
              this.clear(itemPart && itemPart.endNode);
          }
      }
      clear(startNode = this.startNode) {
          removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
      }
  }
  /**
   * Implements a boolean attribute, roughly as defined in the HTML
   * specification.
   *
   * If the value is truthy, then the attribute is present with a value of
   * ''. If the value is falsey, the attribute is removed.
   */
  class BooleanAttributePart {
      constructor(element, name, strings) {
          this.value = undefined;
          this.__pendingValue = undefined;
          if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
              throw new Error('Boolean attributes can only contain a single expression');
          }
          this.element = element;
          this.name = name;
          this.strings = strings;
      }
      setValue(value) {
          this.__pendingValue = value;
      }
      commit() {
          while (isDirective(this.__pendingValue)) {
              const directive = this.__pendingValue;
              this.__pendingValue = noChange;
              directive(this);
          }
          if (this.__pendingValue === noChange) {
              return;
          }
          const value = !!this.__pendingValue;
          if (this.value !== value) {
              if (value) {
                  this.element.setAttribute(this.name, '');
              }
              else {
                  this.element.removeAttribute(this.name);
              }
              this.value = value;
          }
          this.__pendingValue = noChange;
      }
  }
  /**
   * Sets attribute values for PropertyParts, so that the value is only set once
   * even if there are multiple parts for a property.
   *
   * If an expression controls the whole property value, then the value is simply
   * assigned to the property under control. If there are string literals or
   * multiple expressions, then the strings are expressions are interpolated into
   * a string first.
   */
  class PropertyCommitter extends AttributeCommitter {
      constructor(element, name, strings) {
          super(element, name, strings);
          this.single =
              (strings.length === 2 && strings[0] === '' && strings[1] === '');
      }
      _createPart() {
          return new PropertyPart(this);
      }
      _getValue() {
          if (this.single) {
              return this.parts[0].value;
          }
          return super._getValue();
      }
      commit() {
          if (this.dirty) {
              this.dirty = false;
              // tslint:disable-next-line:no-any
              this.element[this.name] = this._getValue();
          }
      }
  }
  class PropertyPart extends AttributePart {
  }
  // Detect event listener options support. If the `capture` property is read
  // from the options object, then options are supported. If not, then the thrid
  // argument to add/removeEventListener is interpreted as the boolean capture
  // value so we should only pass the `capture` property.
  let eventOptionsSupported = false;
  try {
      const options = {
          get capture() {
              eventOptionsSupported = true;
              return false;
          }
      };
      // tslint:disable-next-line:no-any
      window.addEventListener('test', options, options);
      // tslint:disable-next-line:no-any
      window.removeEventListener('test', options, options);
  }
  catch (_e) {
  }
  class EventPart {
      constructor(element, eventName, eventContext) {
          this.value = undefined;
          this.__pendingValue = undefined;
          this.element = element;
          this.eventName = eventName;
          this.eventContext = eventContext;
          this.__boundHandleEvent = (e) => this.handleEvent(e);
      }
      setValue(value) {
          this.__pendingValue = value;
      }
      commit() {
          while (isDirective(this.__pendingValue)) {
              const directive = this.__pendingValue;
              this.__pendingValue = noChange;
              directive(this);
          }
          if (this.__pendingValue === noChange) {
              return;
          }
          const newListener = this.__pendingValue;
          const oldListener = this.value;
          const shouldRemoveListener = newListener == null ||
              oldListener != null &&
                  (newListener.capture !== oldListener.capture ||
                      newListener.once !== oldListener.once ||
                      newListener.passive !== oldListener.passive);
          const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
          if (shouldRemoveListener) {
              this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
          }
          if (shouldAddListener) {
              this.__options = getOptions(newListener);
              this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
          }
          this.value = newListener;
          this.__pendingValue = noChange;
      }
      handleEvent(event) {
          if (typeof this.value === 'function') {
              this.value.call(this.eventContext || this.element, event);
          }
          else {
              this.value.handleEvent(event);
          }
      }
  }
  // We copy options because of the inconsistent behavior of browsers when reading
  // the third argument of add/removeEventListener. IE11 doesn't support options
  // at all. Chrome 41 only reads `capture` if the argument is an object.
  const getOptions = (o) => o &&
      (eventOptionsSupported ?
          { capture: o.capture, passive: o.passive, once: o.once } :
          o.capture);
  //# sourceMappingURL=parts.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  /**
   * Creates Parts when a template is instantiated.
   */
  class DefaultTemplateProcessor {
      /**
       * Create parts for an attribute-position binding, given the event, attribute
       * name, and string literals.
       *
       * @param element The element containing the binding
       * @param name  The attribute name
       * @param strings The string literals. There are always at least two strings,
       *   event for fully-controlled bindings with a single expression.
       */
      handleAttributeExpressions(element, name, strings, options) {
          const prefix = name[0];
          if (prefix === '.') {
              const committer = new PropertyCommitter(element, name.slice(1), strings);
              return committer.parts;
          }
          if (prefix === '@') {
              return [new EventPart(element, name.slice(1), options.eventContext)];
          }
          if (prefix === '?') {
              return [new BooleanAttributePart(element, name.slice(1), strings)];
          }
          const committer = new AttributeCommitter(element, name, strings);
          return committer.parts;
      }
      /**
       * Create parts for a text-position binding.
       * @param templateFactory
       */
      handleTextExpression(options) {
          return new NodePart(options);
      }
  }
  const defaultTemplateProcessor = new DefaultTemplateProcessor();
  //# sourceMappingURL=default-template-processor.js.map

  /**
   * @license
   * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at
   * http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at
   * http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at
   * http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at
   * http://polymer.github.io/PATENTS.txt
   */
  // IMPORTANT: do not change the property name or the assignment expression.
  // This line will be used in regexes to search for lit-html usage.
  // TODO(justinfagnani): inject version number at build time
  (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.1.2');
  /**
   * Interprets a template literal as an HTML template that can efficiently
   * render to and update a container.
   */
  const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);
  //# sourceMappingURL=lit-html.js.map

  const polyline = polyline_1;
  const decodeLine = (lineString) => polyline.decode(lineString).map(pair => pair.reverse());
  const truncate = (value, radix = 6) => Math.trunc(value * 10 ** radix) / 10 ** radix;
  const createGeoCoord = (lng, lat) => ({
      type: 'lng_lat',
      lng,
      lat
  });

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

  var mapboxGl = createCommonjsModule(function (module, exports) {
  /* Mapbox GL JS is licensed under the 3-Clause BSD License. Full text of license: https://github.com/mapbox/mapbox-gl-js/blob/v1.4.0/LICENSE.txt */
  (function (global, factory) {
   module.exports = factory() ;
  }(commonjsGlobal, function () {
  /* eslint-disable */

  var shared, worker, mapboxgl;
  // define gets called three times: one for each chunk. we rely on the order
  // they're imported to know which is which
  function define(_, chunk) {
  if (!shared) {
      shared = chunk;
  } else if (!worker) {
      worker = chunk;
  } else {
      var workerBundleString = 'var sharedChunk = {}; (' + shared + ')(sharedChunk); (' + worker + ')(sharedChunk);';

      var sharedChunk = {};
      shared(sharedChunk);
      mapboxgl = chunk(sharedChunk);
      mapboxgl.workerUrl = window.URL.createObjectURL(new Blob([workerBundleString], { type: 'text/javascript' }));
  }
  }


  define(["exports"],(function(t){function e(t,e){return t(e={exports:{}},e.exports),e.exports}var r=n;function n(t,e,r,n){this.cx=3*t,this.bx=3*(r-t)-this.cx,this.ax=1-this.cx-this.bx,this.cy=3*e,this.by=3*(n-e)-this.cy,this.ay=1-this.cy-this.by,this.p1x=t,this.p1y=n,this.p2x=r,this.p2y=n;}n.prototype.sampleCurveX=function(t){return ((this.ax*t+this.bx)*t+this.cx)*t},n.prototype.sampleCurveY=function(t){return ((this.ay*t+this.by)*t+this.cy)*t},n.prototype.sampleCurveDerivativeX=function(t){return (3*this.ax*t+2*this.bx)*t+this.cx},n.prototype.solveCurveX=function(t,e){var r,n,i,a,o;for(void 0===e&&(e=1e-6),i=t,o=0;o<8;o++){if(a=this.sampleCurveX(i)-t,Math.abs(a)<e)return i;var s=this.sampleCurveDerivativeX(i);if(Math.abs(s)<1e-6)break;i-=a/s;}if((i=t)<(r=0))return r;if(i>(n=1))return n;for(;r<n;){if(a=this.sampleCurveX(i),Math.abs(a-t)<e)return i;t>a?r=i:n=i,i=.5*(n-r)+r;}return i},n.prototype.solve=function(t,e){return this.sampleCurveY(this.solveCurveX(t,e))};var i=a;function a(t,e){this.x=t,this.y=e;}function o(t,e){if(Array.isArray(t)){if(!Array.isArray(e)||t.length!==e.length)return !1;for(var r=0;r<t.length;r++)if(!o(t[r],e[r]))return !1;return !0}if("object"==typeof t&&null!==t&&null!==e){if("object"!=typeof e)return !1;if(Object.keys(t).length!==Object.keys(e).length)return !1;for(var n in t)if(!o(t[n],e[n]))return !1;return !0}return t===e}function s(t,e,n,i){var a=new r(t,e,n,i);return function(t){return a.solve(t)}}a.prototype={clone:function(){return new a(this.x,this.y)},add:function(t){return this.clone()._add(t)},sub:function(t){return this.clone()._sub(t)},multByPoint:function(t){return this.clone()._multByPoint(t)},divByPoint:function(t){return this.clone()._divByPoint(t)},mult:function(t){return this.clone()._mult(t)},div:function(t){return this.clone()._div(t)},rotate:function(t){return this.clone()._rotate(t)},rotateAround:function(t,e){return this.clone()._rotateAround(t,e)},matMult:function(t){return this.clone()._matMult(t)},unit:function(){return this.clone()._unit()},perp:function(){return this.clone()._perp()},round:function(){return this.clone()._round()},mag:function(){return Math.sqrt(this.x*this.x+this.y*this.y)},equals:function(t){return this.x===t.x&&this.y===t.y},dist:function(t){return Math.sqrt(this.distSqr(t))},distSqr:function(t){var e=t.x-this.x,r=t.y-this.y;return e*e+r*r},angle:function(){return Math.atan2(this.y,this.x)},angleTo:function(t){return Math.atan2(this.y-t.y,this.x-t.x)},angleWith:function(t){return this.angleWithSep(t.x,t.y)},angleWithSep:function(t,e){return Math.atan2(this.x*e-this.y*t,this.x*t+this.y*e)},_matMult:function(t){var e=t[0]*this.x+t[1]*this.y,r=t[2]*this.x+t[3]*this.y;return this.x=e,this.y=r,this},_add:function(t){return this.x+=t.x,this.y+=t.y,this},_sub:function(t){return this.x-=t.x,this.y-=t.y,this},_mult:function(t){return this.x*=t,this.y*=t,this},_div:function(t){return this.x/=t,this.y/=t,this},_multByPoint:function(t){return this.x*=t.x,this.y*=t.y,this},_divByPoint:function(t){return this.x/=t.x,this.y/=t.y,this},_unit:function(){return this._div(this.mag()),this},_perp:function(){var t=this.y;return this.y=this.x,this.x=-t,this},_rotate:function(t){var e=Math.cos(t),r=Math.sin(t),n=e*this.x-r*this.y,i=r*this.x+e*this.y;return this.x=n,this.y=i,this},_rotateAround:function(t,e){var r=Math.cos(t),n=Math.sin(t),i=e.x+r*(this.x-e.x)-n*(this.y-e.y),a=e.y+n*(this.x-e.x)+r*(this.y-e.y);return this.x=i,this.y=a,this},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}},a.convert=function(t){return t instanceof a?t:Array.isArray(t)?new a(t[0],t[1]):t};var u=s(.25,.1,.25,1);function l(t,e,r){return Math.min(r,Math.max(e,t))}function p(t,e,r){var n=r-e,i=((t-e)%n+n)%n+e;return i===e?r:i}function c(t){for(var e=[],r=arguments.length-1;r-- >0;)e[r]=arguments[r+1];for(var n=0,i=e;n<i.length;n+=1){var a=i[n];for(var o in a)t[o]=a[o];}return t}var h=1;function f(){return h++}function y(){return function t(e){return e?(e^16*Math.random()>>e/4).toString(16):([1e7]+-[1e3]+-4e3+-8e3+-1e11).replace(/[018]/g,t)}()}function d(t){return !!t&&/^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)}function m(t,e){t.forEach((function(t){e[t]&&(e[t]=e[t].bind(e));}));}function v(t,e){return -1!==t.indexOf(e,t.length-e.length)}function g(t,e,r){var n={};for(var i in t)n[i]=e.call(r||this,t[i],i,t);return n}function x(t,e,r){var n={};for(var i in t)e.call(r||this,t[i],i,t)&&(n[i]=t[i]);return n}function b(t){return Array.isArray(t)?t.map(b):"object"==typeof t&&t?g(t,b):t}var _={};function w(t){_[t]||("undefined"!=typeof console&&console.warn(t),_[t]=!0);}function A(t,e,r){return (r.y-t.y)*(e.x-t.x)>(e.y-t.y)*(r.x-t.x)}function k(t){for(var e=0,r=0,n=t.length,i=n-1,a=void 0,o=void 0;r<n;i=r++)a=t[r],e+=((o=t[i]).x-a.x)*(a.y+o.y);return e}function S(t){var e={};if(t.replace(/(?:^|(?:\s*\,\s*))([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)(?:\=(?:([^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)|(?:\"((?:[^"\\]|\\.)*)\")))?/g,(function(t,r,n,i){var a=n||i;return e[r]=!a||a.toLowerCase(),""})),e["max-age"]){var r=parseInt(e["max-age"],10);isNaN(r)?delete e["max-age"]:e["max-age"]=r;}return e}function z(t){try{var e=self[t];return e.setItem("_mapbox_test_",1),e.removeItem("_mapbox_test_"),!0}catch(t){return !1}}var I,C,B,E,M=self.performance&&self.performance.now?self.performance.now.bind(self.performance):Date.now.bind(Date),P=self.requestAnimationFrame||self.mozRequestAnimationFrame||self.webkitRequestAnimationFrame||self.msRequestAnimationFrame,T=self.cancelAnimationFrame||self.mozCancelAnimationFrame||self.webkitCancelAnimationFrame||self.msCancelAnimationFrame,V={now:M,frame:function(t){var e=P(t);return {cancel:function(){return T(e)}}},getImageData:function(t,e){void 0===e&&(e=0);var r=self.document.createElement("canvas"),n=r.getContext("2d");if(!n)throw new Error("failed to create canvas 2d context");return r.width=t.width,r.height=t.height,n.drawImage(t,0,0,t.width,t.height),n.getImageData(-e,-e,t.width+2*e,t.height+2*e)},resolveURL:function(t){return I||(I=self.document.createElement("a")),I.href=t,I.href},hardwareConcurrency:self.navigator.hardwareConcurrency||4,get devicePixelRatio(){return self.devicePixelRatio},get prefersReducedMotion(){return !!self.matchMedia&&(null==C&&(C=self.matchMedia("(prefers-reduced-motion: reduce)")),C.matches)}},F={API_URL:"https://api.mapbox.com",get EVENTS_URL(){return this.API_URL?0===this.API_URL.indexOf("https://api.mapbox.cn")?"https://events.mapbox.cn/events/v2":0===this.API_URL.indexOf("https://api.mapbox.com")?"https://events.mapbox.com/events/v2":null:null},FEEDBACK_URL:"https://apps.mapbox.com/feedback",REQUIRE_ACCESS_TOKEN:!0,ACCESS_TOKEN:null,MAX_PARALLEL_IMAGE_REQUESTS:16},O={supported:!1,testSupport:function(t){if(L||!E)return;D?U(t):B=t;}},L=!1,D=!1;function U(t){var e=t.createTexture();t.bindTexture(t.TEXTURE_2D,e);try{if(t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,E),t.isContextLost())return;O.supported=!0;}catch(t){}t.deleteTexture(e),L=!0;}self.document&&((E=self.document.createElement("img")).onload=function(){B&&U(B),B=null,D=!0;},E.onerror=function(){L=!0,B=null;},E.src="data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=");var R="01";var j=function(t,e){this._transformRequestFn=t,this._customAccessToken=e,this._createSkuToken();};function q(t){return 0===t.indexOf("mapbox:")}j.prototype._createSkuToken=function(){var t=function(){for(var t="",e=0;e<10;e++)t+="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(62*Math.random())];return {token:["1",R,t].join(""),tokenExpiresAt:Date.now()+432e5}}();this._skuToken=t.token,this._skuTokenExpiresAt=t.tokenExpiresAt;},j.prototype._isSkuTokenExpired=function(){return Date.now()>this._skuTokenExpiresAt},j.prototype.transformRequest=function(t,e){return this._transformRequestFn&&this._transformRequestFn(t,e)||{url:t}},j.prototype.normalizeStyleURL=function(t,e){if(!q(t))return t;var r=X(t);return r.path="/styles/v1"+r.path,this._makeAPIURL(r,this._customAccessToken||e)},j.prototype.normalizeGlyphsURL=function(t,e){if(!q(t))return t;var r=X(t);return r.path="/fonts/v1"+r.path,this._makeAPIURL(r,this._customAccessToken||e)},j.prototype.normalizeSourceURL=function(t,e){if(!q(t))return t;var r=X(t);return r.path="/v4/"+r.authority+".json",r.params.push("secure"),this._makeAPIURL(r,this._customAccessToken||e)},j.prototype.normalizeSpriteURL=function(t,e,r,n){var i=X(t);return q(t)?(i.path="/styles/v1"+i.path+"/sprite"+e+r,this._makeAPIURL(i,this._customAccessToken||n)):(i.path+=""+e+r,G(i))},j.prototype.normalizeTileURL=function(t,e,r){if(this._isSkuTokenExpired()&&this._createSkuToken(),!e||!q(e))return t;var n=X(t),i=V.devicePixelRatio>=2||512===r?"@2x":"",a=O.supported?".webp":"$1";return n.path=n.path.replace(/(\.(png|jpg)\d*)(?=$)/,""+i+a),n.path=n.path.replace(/^.+\/v4\//,"/"),n.path="/v4"+n.path,F.REQUIRE_ACCESS_TOKEN&&(F.ACCESS_TOKEN||this._customAccessToken)&&this._skuToken&&n.params.push("sku="+this._skuToken),this._makeAPIURL(n,this._customAccessToken)},j.prototype.canonicalizeTileURL=function(t){var e=X(t);if(!e.path.match(/(^\/v4\/)/)||!e.path.match(/\.[\w]+$/))return t;var r="mapbox://tiles/";r+=e.path.replace("/v4/","");var n=e.params.filter((function(t){return !t.match(/^access_token=/)}));return n.length&&(r+="?"+n.join("&")),r},j.prototype.canonicalizeTileset=function(t,e){if(!q(e))return t.tiles||[];for(var r=[],n=0,i=t.tiles;n<i.length;n+=1){var a=i[n],o=this.canonicalizeTileURL(a);r.push(o);}return r},j.prototype._makeAPIURL=function(t,e){var r="See https://www.mapbox.com/api-documentation/#access-tokens-and-token-scopes",n=X(F.API_URL);if(t.protocol=n.protocol,t.authority=n.authority,"/"!==n.path&&(t.path=""+n.path+t.path),!F.REQUIRE_ACCESS_TOKEN)return G(t);if(!(e=e||F.ACCESS_TOKEN))throw new Error("An API access token is required to use Mapbox GL. "+r);if("s"===e[0])throw new Error("Use a public access token (pk.*) with Mapbox GL, not a secret access token (sk.*). "+r);return t.params=t.params.filter((function(t){return -1===t.indexOf("access_token")})),t.params.push("access_token="+e),G(t)};var N=/^((https?:)?\/\/)?([^\/]+\.)?mapbox\.c(n|om)(\/|\?|$)/i;function K(t){return N.test(t)}var Z=/^(\w+):\/\/([^/?]*)(\/[^?]+)?\??(.+)?/;function X(t){var e=t.match(Z);if(!e)throw new Error("Unable to parse URL object");return {protocol:e[1],authority:e[2],path:e[3]||"/",params:e[4]?e[4].split("&"):[]}}function G(t){var e=t.params.length?"?"+t.params.join("&"):"";return t.protocol+"://"+t.authority+t.path+e}function J(t){if(!t)return null;var e,r=t.split(".");if(!r||3!==r.length)return null;try{return JSON.parse((e=r[1],decodeURIComponent(self.atob(e).split("").map((function(t){return "%"+("00"+t.charCodeAt(0).toString(16)).slice(-2)})).join(""))))}catch(t){return null}}var H=function(t){this.type=t,this.anonId=null,this.eventData={},this.queue=[],this.pendingRequest=null;};H.prototype.getStorageKey=function(t){var e,r=J(F.ACCESS_TOKEN),n="";return r&&r.u?(e=r.u,n=self.btoa(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g,(function(t,e){return String.fromCharCode(Number("0x"+e))})))):n=F.ACCESS_TOKEN||"",t?"mapbox.eventData."+t+":"+n:"mapbox.eventData:"+n},H.prototype.fetchEventData=function(){var t=z("localStorage"),e=this.getStorageKey(),r=this.getStorageKey("uuid");if(t)try{var n=self.localStorage.getItem(e);n&&(this.eventData=JSON.parse(n));var i=self.localStorage.getItem(r);i&&(this.anonId=i);}catch(t){w("Unable to read from LocalStorage");}},H.prototype.saveEventData=function(){var t=z("localStorage"),e=this.getStorageKey(),r=this.getStorageKey("uuid");if(t)try{self.localStorage.setItem(r,this.anonId),Object.keys(this.eventData).length>=1&&self.localStorage.setItem(e,JSON.stringify(this.eventData));}catch(t){w("Unable to write to LocalStorage");}},H.prototype.processRequests=function(t){},H.prototype.postEvent=function(t,e,r,n){var i=this;if(F.EVENTS_URL){var a=X(F.EVENTS_URL);a.params.push("access_token="+(n||F.ACCESS_TOKEN||""));var o={event:this.type,created:new Date(t).toISOString(),sdkIdentifier:"mapbox-gl-js",sdkVersion:"1.4.0",skuId:R,userId:this.anonId},s=e?c(o,e):o,u={url:G(a),headers:{"Content-Type":"text/plain"},body:JSON.stringify([s])};this.pendingRequest=vt(u,(function(t){i.pendingRequest=null,r(t),i.saveEventData(),i.processRequests(n);}));}},H.prototype.queueRequest=function(t,e){this.queue.push(t),this.processRequests(e);};var Y,$=function(t){function e(){t.call(this,"map.load"),this.success={},this.skuToken="";}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.postMapLoadEvent=function(t,e,r,n){this.skuToken=r,(F.EVENTS_URL&&n||F.ACCESS_TOKEN&&Array.isArray(t)&&t.some((function(t){return q(t)||K(t)})))&&this.queueRequest({id:e,timestamp:Date.now()},n);},e.prototype.processRequests=function(t){var e=this;if(!this.pendingRequest&&0!==this.queue.length){var r=this.queue.shift(),n=r.id,i=r.timestamp;n&&this.success[n]||(this.anonId||this.fetchEventData(),d(this.anonId)||(this.anonId=y()),this.postEvent(i,{skuToken:this.skuToken},(function(t){t||n&&(e.success[n]=!0);}),t));}},e}(H),W=new(function(t){function e(e){t.call(this,"appUserTurnstile"),this._customAccessToken=e;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.postTurnstileEvent=function(t,e){F.EVENTS_URL&&F.ACCESS_TOKEN&&Array.isArray(t)&&t.some((function(t){return q(t)||K(t)}))&&this.queueRequest(Date.now(),e);},e.prototype.processRequests=function(t){var e=this;if(!this.pendingRequest&&0!==this.queue.length){this.anonId&&this.eventData.lastSuccess&&this.eventData.tokenU||this.fetchEventData();var r=J(F.ACCESS_TOKEN),n=r?r.u:F.ACCESS_TOKEN,i=n!==this.eventData.tokenU;d(this.anonId)||(this.anonId=y(),i=!0);var a=this.queue.shift();if(this.eventData.lastSuccess){var o=new Date(this.eventData.lastSuccess),s=new Date(a),u=(a-this.eventData.lastSuccess)/864e5;i=i||u>=1||u<-1||o.getDate()!==s.getDate();}else i=!0;if(!i)return this.processRequests();this.postEvent(a,{"enabled.telemetry":!1},(function(t){t||(e.eventData.lastSuccess=a,e.eventData.tokenU=n);}),t);}},e}(H)),Q=W.postTurnstileEvent.bind(W),tt=new $,et=tt.postMapLoadEvent.bind(tt),rt="mapbox-tiles",nt=500,it=50,at=42e4;function ot(t,e,r){if(self.caches){var n={status:e.status,statusText:e.statusText,headers:new self.Headers};e.headers.forEach((function(t,e){return n.headers.set(e,t)}));var i=S(e.headers.get("Cache-Control")||"");if(!i["no-store"])i["max-age"]&&n.headers.set("Expires",new Date(r+1e3*i["max-age"]).toUTCString()),new Date(n.headers.get("Expires")).getTime()-r<at||function(t,e){if(void 0===Y)try{new Response(new ReadableStream),Y=!0;}catch(t){Y=!1;}Y?e(t.body):t.blob().then(e);}(e,(function(e){var r=new self.Response(e,n);self.caches.open(rt).then((function(e){return e.put(st(t.url),r)})).catch((function(t){return w(t.message)}));}));}}function st(t){var e=t.indexOf("?");return e<0?t:t.slice(0,e)}function ut(t,e){if(!self.caches)return e(null);var r=st(t.url);self.caches.open(rt).then((function(t){t.match(r).catch(e).then((function(n){var i=function(t){if(!t)return !1;var e=new Date(t.headers.get("Expires")),r=S(t.headers.get("Cache-Control")||"");return e>Date.now()&&!r["no-cache"]}(n);t.delete(r),i&&t.put(r,n.clone()),e(null,n,i);}));})).catch(e);}var lt=1/0;var pt={Unknown:"Unknown",Style:"Style",Source:"Source",Tile:"Tile",Glyphs:"Glyphs",SpriteImage:"SpriteImage",SpriteJSON:"SpriteJSON",Image:"Image"};"function"==typeof Object.freeze&&Object.freeze(pt);var ct=function(t){function e(e,r,n){401===r&&K(n)&&(e+=": you may have provided an invalid Mapbox access token. See https://www.mapbox.com/api-documentation/#access-tokens-and-token-scopes"),t.call(this,e),this.status=r,this.url=n,this.name=this.constructor.name,this.message=e;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.toString=function(){return this.name+": "+this.message+" ("+this.status+"): "+this.url},e}(Error);function ht(){return "undefined"!=typeof WorkerGlobalScope&&"undefined"!=typeof self&&self instanceof WorkerGlobalScope}var ft=ht()?function(){return self.worker&&self.worker.referrer}:function(){return ("blob:"===self.location.protocol?self.parent:self).location.href};function yt(t,e){var r,n=new self.AbortController,i=new self.Request(t.url,{method:t.method||"GET",body:t.body,credentials:t.credentials,headers:t.headers,referrer:ft(),signal:n.signal}),a=!1,o=!1,s=(r=i.url).indexOf("sku=")>0&&K(r);"json"===t.type&&i.headers.set("Accept","application/json");var u=function(r,n,a){if(!o){if(r&&"SecurityError"!==r.message&&w(r),n&&a)return l(n);var u=Date.now();self.fetch(i).then((function(r){if(r.ok){var n=s?r.clone():null;return l(r,n,u)}return e(new ct(r.statusText,r.status,t.url))})).catch((function(t){20!==t.code&&e(new Error(t.message));}));}},l=function(r,n,s){("arrayBuffer"===t.type?r.arrayBuffer():"json"===t.type?r.json():r.text()).then((function(t){o||(n&&s&&ot(i,n,s),a=!0,e(null,t,r.headers.get("Cache-Control"),r.headers.get("Expires")));})).catch((function(t){return e(new Error(t.message))}));};return s?ut(i,u):u(null,null),{cancel:function(){o=!0,a||n.abort();}}}var dt=function(t,e){if(r=t.url,!(/^file:/.test(r)||/^file:/.test(ft())&&!/^\w+:/.test(r))){if(self.fetch&&self.Request&&self.AbortController&&self.Request.prototype.hasOwnProperty("signal"))return yt(t,e);if(ht()&&self.worker&&self.worker.actor)return self.worker.actor.send("getResource",t,e)}var r;return function(t,e){var r=new self.XMLHttpRequest;for(var n in r.open(t.method||"GET",t.url,!0),"arrayBuffer"===t.type&&(r.responseType="arraybuffer"),t.headers)r.setRequestHeader(n,t.headers[n]);return "json"===t.type&&(r.responseType="text",r.setRequestHeader("Accept","application/json")),r.withCredentials="include"===t.credentials,r.onerror=function(){e(new Error(r.statusText));},r.onload=function(){if((r.status>=200&&r.status<300||0===r.status)&&null!==r.response){var n=r.response;if("json"===t.type)try{n=JSON.parse(r.response);}catch(t){return e(t)}e(null,n,r.getResponseHeader("Cache-Control"),r.getResponseHeader("Expires"));}else e(new ct(r.statusText,r.status,t.url));},r.send(t.body),{cancel:function(){return r.abort()}}}(t,e)},mt=function(t,e){return dt(c(t,{type:"arrayBuffer"}),e)},vt=function(t,e){return dt(c(t,{method:"POST"}),e)};var gt,xt;gt=[],xt=0;var bt=function(t,e){if(xt>=F.MAX_PARALLEL_IMAGE_REQUESTS){var r={requestParameters:t,callback:e,cancelled:!1,cancel:function(){this.cancelled=!0;}};return gt.push(r),r}xt++;var n=!1,i=function(){if(!n)for(n=!0,xt--;gt.length&&xt<F.MAX_PARALLEL_IMAGE_REQUESTS;){var t=gt.shift(),e=t.requestParameters,r=t.callback;t.cancelled||(t.cancel=bt(e,r).cancel);}},a=mt(t,(function(t,r,n,a){if(i(),t)e(t);else if(r){var o=new self.Image,s=self.URL||self.webkitURL;o.onload=function(){e(null,o),s.revokeObjectURL(o.src);},o.onerror=function(){return e(new Error("Could not load image. Please make sure to use a supported image type such as PNG or JPEG. Note that SVGs are not supported."))};var u=new self.Blob([new Uint8Array(r)],{type:"image/png"});o.cacheControl=n,o.expires=a,o.src=r.byteLength?s.createObjectURL(u):"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=";}}));return {cancel:function(){a.cancel(),i();}}};function _t(t,e,r){r[t]&&-1!==r[t].indexOf(e)||(r[t]=r[t]||[],r[t].push(e));}function wt(t,e,r){if(r&&r[t]){var n=r[t].indexOf(e);-1!==n&&r[t].splice(n,1);}}var At=function(t,e){void 0===e&&(e={}),c(this,e),this.type=t;},kt=function(t){function e(e,r){void 0===r&&(r={}),t.call(this,"error",c({error:e},r));}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e}(At),St=function(){};St.prototype.on=function(t,e){return this._listeners=this._listeners||{},_t(t,e,this._listeners),this},St.prototype.off=function(t,e){return wt(t,e,this._listeners),wt(t,e,this._oneTimeListeners),this},St.prototype.once=function(t,e){return this._oneTimeListeners=this._oneTimeListeners||{},_t(t,e,this._oneTimeListeners),this},St.prototype.fire=function(t,e){"string"==typeof t&&(t=new At(t,e||{}));var r=t.type;if(this.listens(r)){t.target=this;for(var n=0,i=this._listeners&&this._listeners[r]?this._listeners[r].slice():[];n<i.length;n+=1){i[n].call(this,t);}for(var a=0,o=this._oneTimeListeners&&this._oneTimeListeners[r]?this._oneTimeListeners[r].slice():[];a<o.length;a+=1){var s=o[a];wt(r,s,this._oneTimeListeners),s.call(this,t);}var u=this._eventedParent;u&&(c(t,"function"==typeof this._eventedParentData?this._eventedParentData():this._eventedParentData),u.fire(t));}else t instanceof kt&&console.error(t.error);return this},St.prototype.listens=function(t){return this._listeners&&this._listeners[t]&&this._listeners[t].length>0||this._oneTimeListeners&&this._oneTimeListeners[t]&&this._oneTimeListeners[t].length>0||this._eventedParent&&this._eventedParent.listens(t)},St.prototype.setEventedParent=function(t,e){return this._eventedParent=t,this._eventedParentData=e,this};var zt={$version:8,$root:{version:{required:!0,type:"enum",values:[8]},name:{type:"string"},metadata:{type:"*"},center:{type:"array",value:"number"},zoom:{type:"number"},bearing:{type:"number",default:0,period:360,units:"degrees"},pitch:{type:"number",default:0,units:"degrees"},light:{type:"light"},sources:{required:!0,type:"sources"},sprite:{type:"string"},glyphs:{type:"string"},transition:{type:"transition"},layers:{required:!0,type:"array",value:"layer"}},sources:{"*":{type:"source"}},source:["source_vector","source_raster","source_raster_dem","source_geojson","source_video","source_image"],source_vector:{type:{required:!0,type:"enum",values:{vector:{}}},url:{type:"string"},tiles:{type:"array",value:"string"},bounds:{type:"array",value:"number",length:4,default:[-180,-85.051129,180,85.051129]},scheme:{type:"enum",values:{xyz:{},tms:{}},default:"xyz"},minzoom:{type:"number",default:0},maxzoom:{type:"number",default:22},attribution:{type:"string"},"*":{type:"*"}},source_raster:{type:{required:!0,type:"enum",values:{raster:{}}},url:{type:"string"},tiles:{type:"array",value:"string"},bounds:{type:"array",value:"number",length:4,default:[-180,-85.051129,180,85.051129]},minzoom:{type:"number",default:0},maxzoom:{type:"number",default:22},tileSize:{type:"number",default:512,units:"pixels"},scheme:{type:"enum",values:{xyz:{},tms:{}},default:"xyz"},attribution:{type:"string"},"*":{type:"*"}},source_raster_dem:{type:{required:!0,type:"enum",values:{"raster-dem":{}}},url:{type:"string"},tiles:{type:"array",value:"string"},bounds:{type:"array",value:"number",length:4,default:[-180,-85.051129,180,85.051129]},minzoom:{type:"number",default:0},maxzoom:{type:"number",default:22},tileSize:{type:"number",default:512,units:"pixels"},attribution:{type:"string"},encoding:{type:"enum",values:{terrarium:{},mapbox:{}},default:"mapbox"},"*":{type:"*"}},source_geojson:{type:{required:!0,type:"enum",values:{geojson:{}}},data:{type:"*"},maxzoom:{type:"number",default:18},attribution:{type:"string"},buffer:{type:"number",default:128,maximum:512,minimum:0},tolerance:{type:"number",default:.375},cluster:{type:"boolean",default:!1},clusterRadius:{type:"number",default:50,minimum:0},clusterMaxZoom:{type:"number"},clusterProperties:{type:"*"},lineMetrics:{type:"boolean",default:!1},generateId:{type:"boolean",default:!1}},source_video:{type:{required:!0,type:"enum",values:{video:{}}},urls:{required:!0,type:"array",value:"string"},coordinates:{required:!0,type:"array",length:4,value:{type:"array",length:2,value:"number"}}},source_image:{type:{required:!0,type:"enum",values:{image:{}}},url:{required:!0,type:"string"},coordinates:{required:!0,type:"array",length:4,value:{type:"array",length:2,value:"number"}}},layer:{id:{type:"string",required:!0},type:{type:"enum",values:{fill:{},line:{},symbol:{},circle:{},heatmap:{},"fill-extrusion":{},raster:{},hillshade:{},background:{}},required:!0},metadata:{type:"*"},source:{type:"string"},"source-layer":{type:"string"},minzoom:{type:"number",minimum:0,maximum:24},maxzoom:{type:"number",minimum:0,maximum:24},filter:{type:"filter"},layout:{type:"layout"},paint:{type:"paint"}},layout:["layout_fill","layout_line","layout_circle","layout_heatmap","layout_fill-extrusion","layout_symbol","layout_raster","layout_hillshade","layout_background"],layout_background:{visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_fill:{"fill-sort-key":{type:"number",expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_circle:{"circle-sort-key":{type:"number",expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_heatmap:{visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},"layout_fill-extrusion":{visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_line:{"line-cap":{type:"enum",values:{butt:{},round:{},square:{}},default:"butt",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"line-join":{type:"enum",values:{bevel:{},round:{},miter:{}},default:"miter",expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"line-miter-limit":{type:"number",default:2,requires:[{"line-join":"miter"}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"line-round-limit":{type:"number",default:1.05,requires:[{"line-join":"round"}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"line-sort-key":{type:"number",expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_symbol:{"symbol-placement":{type:"enum",values:{point:{},line:{},"line-center":{}},default:"point",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"symbol-spacing":{type:"number",default:250,minimum:1,units:"pixels",requires:[{"symbol-placement":"line"}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"symbol-avoid-edges":{type:"boolean",default:!1,expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"symbol-sort-key":{type:"number",expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"symbol-z-order":{type:"enum",values:{auto:{},"viewport-y":{},source:{}},default:"auto",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-allow-overlap":{type:"boolean",default:!1,requires:["icon-image"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-ignore-placement":{type:"boolean",default:!1,requires:["icon-image"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-optional":{type:"boolean",default:!1,requires:["icon-image","text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-rotation-alignment":{type:"enum",values:{map:{},viewport:{},auto:{}},default:"auto",requires:["icon-image"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-size":{type:"number",default:1,minimum:0,units:"factor of the original icon size",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"icon-text-fit":{type:"enum",values:{none:{},width:{},height:{},both:{}},default:"none",requires:["icon-image","text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-text-fit-padding":{type:"array",value:"number",length:4,default:[0,0,0,0],units:"pixels",requires:["icon-image","text-field",{"icon-text-fit":["both","width","height"]}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"icon-image":{type:"image",tokens:!0,expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"icon-rotate":{type:"number",default:0,period:360,units:"degrees",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"icon-padding":{type:"number",default:2,minimum:0,units:"pixels",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"icon-keep-upright":{type:"boolean",default:!1,requires:["icon-image",{"icon-rotation-alignment":"map"},{"symbol-placement":["line","line-center"]}],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"icon-offset":{type:"array",value:"number",length:2,default:[0,0],requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"icon-anchor":{type:"enum",values:{center:{},left:{},right:{},top:{},bottom:{},"top-left":{},"top-right":{},"bottom-left":{},"bottom-right":{}},default:"center",requires:["icon-image"],expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"icon-pitch-alignment":{type:"enum",values:{map:{},viewport:{},auto:{}},default:"auto",requires:["icon-image"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-pitch-alignment":{type:"enum",values:{map:{},viewport:{},auto:{}},default:"auto",requires:["text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-rotation-alignment":{type:"enum",values:{map:{},viewport:{},auto:{}},default:"auto",requires:["text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-field":{type:"formatted",default:"",tokens:!0,expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-font":{type:"array",value:"string",default:["Open Sans Regular","Arial Unicode MS Regular"],requires:["text-field"],expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-size":{type:"number",default:16,minimum:0,units:"pixels",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-max-width":{type:"number",default:10,minimum:0,units:"ems",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-line-height":{type:"number",default:1.2,units:"ems",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"text-letter-spacing":{type:"number",default:0,units:"ems",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-justify":{type:"enum",values:{auto:{},left:{},center:{},right:{}},default:"center",requires:["text-field"],expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-radial-offset":{type:"number",units:"ems",default:0,requires:["text-field"],"property-type":"data-driven",expression:{interpolated:!0,parameters:["zoom","feature"]}},"text-variable-anchor":{type:"array",value:"enum",values:{center:{},left:{},right:{},top:{},bottom:{},"top-left":{},"top-right":{},"bottom-left":{},"bottom-right":{}},requires:["text-field",{"symbol-placement":["point"]}],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-anchor":{type:"enum",values:{center:{},left:{},right:{},top:{},bottom:{},"top-left":{},"top-right":{},"bottom-left":{},"bottom-right":{}},default:"center",requires:["text-field",{"!":"text-variable-anchor"}],expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-max-angle":{type:"number",default:45,units:"degrees",requires:["text-field",{"symbol-placement":["line","line-center"]}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"text-writing-mode":{type:"array",value:"enum",values:{horizontal:{},vertical:{}},requires:["text-field",{"symbol-placement":["point"]}],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-rotate":{type:"number",default:0,period:360,units:"degrees",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-padding":{type:"number",default:2,minimum:0,units:"pixels",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"text-keep-upright":{type:"boolean",default:!0,requires:["text-field",{"text-rotation-alignment":"map"},{"symbol-placement":["line","line-center"]}],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-transform":{type:"enum",values:{none:{},uppercase:{},lowercase:{}},default:"none",requires:["text-field"],expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-offset":{type:"array",value:"number",units:"ems",length:2,default:[0,0],requires:["text-field",{"!":"text-radial-offset"}],expression:{interpolated:!0,parameters:["zoom","feature"]},"property-type":"data-driven"},"text-allow-overlap":{type:"boolean",default:!1,requires:["text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-ignore-placement":{type:"boolean",default:!1,requires:["text-field"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-optional":{type:"boolean",default:!1,requires:["text-field","icon-image"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_raster:{visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},layout_hillshade:{visibility:{type:"enum",values:{visible:{},none:{}},default:"visible","property-type":"constant"}},filter:{type:"array",value:"*"},filter_operator:{type:"enum",values:{"==":{},"!=":{},">":{},">=":{},"<":{},"<=":{},in:{},"!in":{},all:{},any:{},none:{},has:{},"!has":{}}},geometry_type:{type:"enum",values:{Point:{},LineString:{},Polygon:{}}},function:{expression:{type:"expression"},stops:{type:"array",value:"function_stop"},base:{type:"number",default:1,minimum:0},property:{type:"string",default:"$zoom"},type:{type:"enum",values:{identity:{},exponential:{},interval:{},categorical:{}},default:"exponential"},colorSpace:{type:"enum",values:{rgb:{},lab:{},hcl:{}},default:"rgb"},default:{type:"*",required:!1}},function_stop:{type:"array",minimum:0,maximum:22,value:["number","color"],length:2},expression:{type:"array",value:"*",minimum:1},expression_name:{type:"enum",values:{let:{group:"Variable binding"},var:{group:"Variable binding"},literal:{group:"Types"},array:{group:"Types"},at:{group:"Lookup"},case:{group:"Decision"},match:{group:"Decision"},coalesce:{group:"Decision"},step:{group:"Ramps, scales, curves"},interpolate:{group:"Ramps, scales, curves"},"interpolate-hcl":{group:"Ramps, scales, curves"},"interpolate-lab":{group:"Ramps, scales, curves"},ln2:{group:"Math"},pi:{group:"Math"},e:{group:"Math"},typeof:{group:"Types"},string:{group:"Types"},number:{group:"Types"},boolean:{group:"Types"},object:{group:"Types"},collator:{group:"Types"},format:{group:"Types"},image:{group:"Types"},"number-format":{group:"Types"},"to-string":{group:"Types"},"to-number":{group:"Types"},"to-boolean":{group:"Types"},"to-rgba":{group:"Color"},"to-color":{group:"Types"},rgb:{group:"Color"},rgba:{group:"Color"},get:{group:"Lookup"},has:{group:"Lookup"},length:{group:"Lookup"},properties:{group:"Feature data"},"feature-state":{group:"Feature data"},"geometry-type":{group:"Feature data"},id:{group:"Feature data"},zoom:{group:"Zoom"},"heatmap-density":{group:"Heatmap"},"line-progress":{group:"Feature data"},accumulated:{group:"Feature data"},"+":{group:"Math"},"*":{group:"Math"},"-":{group:"Math"},"/":{group:"Math"},"%":{group:"Math"},"^":{group:"Math"},sqrt:{group:"Math"},log10:{group:"Math"},ln:{group:"Math"},log2:{group:"Math"},sin:{group:"Math"},cos:{group:"Math"},tan:{group:"Math"},asin:{group:"Math"},acos:{group:"Math"},atan:{group:"Math"},min:{group:"Math"},max:{group:"Math"},round:{group:"Math"},abs:{group:"Math"},ceil:{group:"Math"},floor:{group:"Math"},"==":{group:"Decision"},"!=":{group:"Decision"},">":{group:"Decision"},"<":{group:"Decision"},">=":{group:"Decision"},"<=":{group:"Decision"},all:{group:"Decision"},any:{group:"Decision"},"!":{group:"Decision"},"is-supported-script":{group:"String"},upcase:{group:"String"},downcase:{group:"String"},concat:{group:"String"},"resolved-locale":{group:"String"}}},light:{anchor:{type:"enum",default:"viewport",values:{map:{},viewport:{}},"property-type":"data-constant",transition:!1,expression:{interpolated:!1,parameters:["zoom"]}},position:{type:"array",default:[1.15,210,30],length:3,value:"number","property-type":"data-constant",transition:!0,expression:{interpolated:!0,parameters:["zoom"]}},color:{type:"color","property-type":"data-constant",default:"#ffffff",expression:{interpolated:!0,parameters:["zoom"]},transition:!0},intensity:{type:"number","property-type":"data-constant",default:.5,minimum:0,maximum:1,expression:{interpolated:!0,parameters:["zoom"]},transition:!0}},paint:["paint_fill","paint_line","paint_circle","paint_heatmap","paint_fill-extrusion","paint_symbol","paint_raster","paint_hillshade","paint_background"],paint_fill:{"fill-antialias":{type:"boolean",default:!0,expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"fill-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-color":{type:"color",default:"#000000",transition:!0,requires:[{"!":"fill-pattern"}],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-outline-color":{type:"color",transition:!0,requires:[{"!":"fill-pattern"},{"fill-antialias":!0}],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"fill-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["fill-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"fill-pattern":{type:"image",transition:!0,expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"cross-faded-data-driven"}},"paint_fill-extrusion":{"fill-extrusion-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"fill-extrusion-color":{type:"color",default:"#000000",transition:!0,requires:[{"!":"fill-extrusion-pattern"}],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-extrusion-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"fill-extrusion-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["fill-extrusion-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"fill-extrusion-pattern":{type:"image",transition:!0,expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"cross-faded-data-driven"},"fill-extrusion-height":{type:"number",default:0,minimum:0,units:"meters",transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-extrusion-base":{type:"number",default:0,minimum:0,units:"meters",transition:!0,requires:["fill-extrusion-height"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"fill-extrusion-vertical-gradient":{type:"boolean",default:!0,transition:!1,expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"}},paint_line:{"line-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-color":{type:"color",default:"#000000",transition:!0,requires:[{"!":"line-pattern"}],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"line-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["line-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"line-width":{type:"number",default:1,minimum:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-gap-width":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-offset":{type:"number",default:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-blur":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"line-dasharray":{type:"array",value:"number",minimum:0,transition:!0,units:"line widths",requires:[{"!":"line-pattern"}],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"cross-faded"},"line-pattern":{type:"image",transition:!0,expression:{interpolated:!1,parameters:["zoom","feature"]},"property-type":"cross-faded-data-driven"},"line-gradient":{type:"color",transition:!1,requires:[{"!":"line-dasharray"},{"!":"line-pattern"},{source:"geojson",has:{lineMetrics:!0}}],expression:{interpolated:!0,parameters:["line-progress"]},"property-type":"color-ramp"}},paint_circle:{"circle-radius":{type:"number",default:5,minimum:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-color":{type:"color",default:"#000000",transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-blur":{type:"number",default:0,transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"circle-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["circle-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"circle-pitch-scale":{type:"enum",values:{map:{},viewport:{}},default:"map",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"circle-pitch-alignment":{type:"enum",values:{map:{},viewport:{}},default:"viewport",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"circle-stroke-width":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-stroke-color":{type:"color",default:"#000000",transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"circle-stroke-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"}},paint_heatmap:{"heatmap-radius":{type:"number",default:30,minimum:1,transition:!0,units:"pixels",expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"heatmap-weight":{type:"number",default:1,minimum:0,transition:!1,expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"heatmap-intensity":{type:"number",default:1,minimum:0,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"heatmap-color":{type:"color",default:["interpolate",["linear"],["heatmap-density"],0,"rgba(0, 0, 255, 0)",.1,"royalblue",.3,"cyan",.5,"lime",.7,"yellow",1,"red"],transition:!1,expression:{interpolated:!0,parameters:["heatmap-density"]},"property-type":"color-ramp"},"heatmap-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"}},paint_symbol:{"icon-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"icon-color":{type:"color",default:"#000000",transition:!0,requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"icon-halo-color":{type:"color",default:"rgba(0, 0, 0, 0)",transition:!0,requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"icon-halo-width":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"icon-halo-blur":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"icon-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",requires:["icon-image"],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"icon-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["icon-image","icon-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"text-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"text-color":{type:"color",default:"#000000",transition:!0,overridable:!0,requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"text-halo-color":{type:"color",default:"rgba(0, 0, 0, 0)",transition:!0,requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"text-halo-width":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"text-halo-blur":{type:"number",default:0,minimum:0,transition:!0,units:"pixels",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom","feature","feature-state"]},"property-type":"data-driven"},"text-translate":{type:"array",value:"number",length:2,default:[0,0],transition:!0,units:"pixels",requires:["text-field"],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"text-translate-anchor":{type:"enum",values:{map:{},viewport:{}},default:"map",requires:["text-field","text-translate"],expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"}},paint_raster:{"raster-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-hue-rotate":{type:"number",default:0,period:360,transition:!0,units:"degrees",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-brightness-min":{type:"number",default:0,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-brightness-max":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-saturation":{type:"number",default:0,minimum:-1,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-contrast":{type:"number",default:0,minimum:-1,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"raster-resampling":{type:"enum",values:{linear:{},nearest:{}},default:"linear",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"raster-fade-duration":{type:"number",default:300,minimum:0,transition:!1,units:"milliseconds",expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"}},paint_hillshade:{"hillshade-illumination-direction":{type:"number",default:335,minimum:0,maximum:359,transition:!1,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"hillshade-illumination-anchor":{type:"enum",values:{map:{},viewport:{}},default:"viewport",expression:{interpolated:!1,parameters:["zoom"]},"property-type":"data-constant"},"hillshade-exaggeration":{type:"number",default:.5,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"hillshade-shadow-color":{type:"color",default:"#000000",transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"hillshade-highlight-color":{type:"color",default:"#FFFFFF",transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"hillshade-accent-color":{type:"color",default:"#000000",transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"}},paint_background:{"background-color":{type:"color",default:"#000000",transition:!0,requires:[{"!":"background-pattern"}],expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"},"background-pattern":{type:"image",transition:!0,expression:{interpolated:!1,parameters:["zoom"]},"property-type":"cross-faded"},"background-opacity":{type:"number",default:1,minimum:0,maximum:1,transition:!0,expression:{interpolated:!0,parameters:["zoom"]},"property-type":"data-constant"}},transition:{duration:{type:"number",default:300,minimum:0,units:"milliseconds"},delay:{type:"number",default:0,minimum:0,units:"milliseconds"}},"property-type":{"data-driven":{type:"property-type"},"cross-faded":{type:"property-type"},"cross-faded-data-driven":{type:"property-type"},"color-ramp":{type:"property-type"},"data-constant":{type:"property-type"},constant:{type:"property-type"}}},It=function(t,e,r,n){this.message=(t?t+": ":"")+r,n&&(this.identifier=n),null!=e&&e.__line__&&(this.line=e.__line__);};function Ct(t){var e=t.key,r=t.value;return r?[new It(e,r,"constants have been deprecated as of v8")]:[]}function Bt(t){for(var e=[],r=arguments.length-1;r-- >0;)e[r]=arguments[r+1];for(var n=0,i=e;n<i.length;n+=1){var a=i[n];for(var o in a)t[o]=a[o];}return t}function Et(t){return t instanceof Number||t instanceof String||t instanceof Boolean}function Mt(t){return Et(t)?t.valueOf():t}function Pt(t){if(Array.isArray(t))return t.map(Pt);if(t instanceof Object&&!Et(t)){var e={};for(var r in t)e[r]=Pt(t[r]);return e}return Mt(t)}var Tt=function(t){function e(e,r){t.call(this,r),this.message=r,this.key=e;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e}(Error),Vt=function(t,e){void 0===e&&(e=[]),this.parent=t,this.bindings={};for(var r=0,n=e;r<n.length;r+=1){var i=n[r],a=i[0],o=i[1];this.bindings[a]=o;}};Vt.prototype.concat=function(t){return new Vt(this,t)},Vt.prototype.get=function(t){if(this.bindings[t])return this.bindings[t];if(this.parent)return this.parent.get(t);throw new Error(t+" not found in scope.")},Vt.prototype.has=function(t){return !!this.bindings[t]||!!this.parent&&this.parent.has(t)};var Ft={kind:"null"},Ot={kind:"number"},Lt={kind:"string"},Dt={kind:"boolean"},Ut={kind:"color"},Rt={kind:"object"},jt={kind:"value"},qt={kind:"collator"},Nt={kind:"formatted"},Kt={kind:"image"};function Zt(t,e){return {kind:"array",itemType:t,N:e}}function Xt(t){if("array"===t.kind){var e=Xt(t.itemType);return "number"==typeof t.N?"array<"+e+", "+t.N+">":"value"===t.itemType.kind?"array":"array<"+e+">"}return t.kind}var Gt=[Ft,Ot,Lt,Dt,Ut,Nt,Rt,Zt(jt),Kt];function Jt(t,e){if("error"===e.kind)return null;if("array"===t.kind){if("array"===e.kind&&(0===e.N&&"value"===e.itemType.kind||!Jt(t.itemType,e.itemType))&&("number"!=typeof t.N||t.N===e.N))return null}else{if(t.kind===e.kind)return null;if("value"===t.kind)for(var r=0,n=Gt;r<n.length;r+=1){if(!Jt(n[r],e))return null}}return "Expected "+Xt(t)+" but found "+Xt(e)+" instead."}var Ht=e((function(t,e){var r={transparent:[0,0,0,0],aliceblue:[240,248,255,1],antiquewhite:[250,235,215,1],aqua:[0,255,255,1],aquamarine:[127,255,212,1],azure:[240,255,255,1],beige:[245,245,220,1],bisque:[255,228,196,1],black:[0,0,0,1],blanchedalmond:[255,235,205,1],blue:[0,0,255,1],blueviolet:[138,43,226,1],brown:[165,42,42,1],burlywood:[222,184,135,1],cadetblue:[95,158,160,1],chartreuse:[127,255,0,1],chocolate:[210,105,30,1],coral:[255,127,80,1],cornflowerblue:[100,149,237,1],cornsilk:[255,248,220,1],crimson:[220,20,60,1],cyan:[0,255,255,1],darkblue:[0,0,139,1],darkcyan:[0,139,139,1],darkgoldenrod:[184,134,11,1],darkgray:[169,169,169,1],darkgreen:[0,100,0,1],darkgrey:[169,169,169,1],darkkhaki:[189,183,107,1],darkmagenta:[139,0,139,1],darkolivegreen:[85,107,47,1],darkorange:[255,140,0,1],darkorchid:[153,50,204,1],darkred:[139,0,0,1],darksalmon:[233,150,122,1],darkseagreen:[143,188,143,1],darkslateblue:[72,61,139,1],darkslategray:[47,79,79,1],darkslategrey:[47,79,79,1],darkturquoise:[0,206,209,1],darkviolet:[148,0,211,1],deeppink:[255,20,147,1],deepskyblue:[0,191,255,1],dimgray:[105,105,105,1],dimgrey:[105,105,105,1],dodgerblue:[30,144,255,1],firebrick:[178,34,34,1],floralwhite:[255,250,240,1],forestgreen:[34,139,34,1],fuchsia:[255,0,255,1],gainsboro:[220,220,220,1],ghostwhite:[248,248,255,1],gold:[255,215,0,1],goldenrod:[218,165,32,1],gray:[128,128,128,1],green:[0,128,0,1],greenyellow:[173,255,47,1],grey:[128,128,128,1],honeydew:[240,255,240,1],hotpink:[255,105,180,1],indianred:[205,92,92,1],indigo:[75,0,130,1],ivory:[255,255,240,1],khaki:[240,230,140,1],lavender:[230,230,250,1],lavenderblush:[255,240,245,1],lawngreen:[124,252,0,1],lemonchiffon:[255,250,205,1],lightblue:[173,216,230,1],lightcoral:[240,128,128,1],lightcyan:[224,255,255,1],lightgoldenrodyellow:[250,250,210,1],lightgray:[211,211,211,1],lightgreen:[144,238,144,1],lightgrey:[211,211,211,1],lightpink:[255,182,193,1],lightsalmon:[255,160,122,1],lightseagreen:[32,178,170,1],lightskyblue:[135,206,250,1],lightslategray:[119,136,153,1],lightslategrey:[119,136,153,1],lightsteelblue:[176,196,222,1],lightyellow:[255,255,224,1],lime:[0,255,0,1],limegreen:[50,205,50,1],linen:[250,240,230,1],magenta:[255,0,255,1],maroon:[128,0,0,1],mediumaquamarine:[102,205,170,1],mediumblue:[0,0,205,1],mediumorchid:[186,85,211,1],mediumpurple:[147,112,219,1],mediumseagreen:[60,179,113,1],mediumslateblue:[123,104,238,1],mediumspringgreen:[0,250,154,1],mediumturquoise:[72,209,204,1],mediumvioletred:[199,21,133,1],midnightblue:[25,25,112,1],mintcream:[245,255,250,1],mistyrose:[255,228,225,1],moccasin:[255,228,181,1],navajowhite:[255,222,173,1],navy:[0,0,128,1],oldlace:[253,245,230,1],olive:[128,128,0,1],olivedrab:[107,142,35,1],orange:[255,165,0,1],orangered:[255,69,0,1],orchid:[218,112,214,1],palegoldenrod:[238,232,170,1],palegreen:[152,251,152,1],paleturquoise:[175,238,238,1],palevioletred:[219,112,147,1],papayawhip:[255,239,213,1],peachpuff:[255,218,185,1],peru:[205,133,63,1],pink:[255,192,203,1],plum:[221,160,221,1],powderblue:[176,224,230,1],purple:[128,0,128,1],rebeccapurple:[102,51,153,1],red:[255,0,0,1],rosybrown:[188,143,143,1],royalblue:[65,105,225,1],saddlebrown:[139,69,19,1],salmon:[250,128,114,1],sandybrown:[244,164,96,1],seagreen:[46,139,87,1],seashell:[255,245,238,1],sienna:[160,82,45,1],silver:[192,192,192,1],skyblue:[135,206,235,1],slateblue:[106,90,205,1],slategray:[112,128,144,1],slategrey:[112,128,144,1],snow:[255,250,250,1],springgreen:[0,255,127,1],steelblue:[70,130,180,1],tan:[210,180,140,1],teal:[0,128,128,1],thistle:[216,191,216,1],tomato:[255,99,71,1],turquoise:[64,224,208,1],violet:[238,130,238,1],wheat:[245,222,179,1],white:[255,255,255,1],whitesmoke:[245,245,245,1],yellow:[255,255,0,1],yellowgreen:[154,205,50,1]};function n(t){return (t=Math.round(t))<0?0:t>255?255:t}function i(t){return t<0?0:t>1?1:t}function a(t){return "%"===t[t.length-1]?n(parseFloat(t)/100*255):n(parseInt(t))}function o(t){return "%"===t[t.length-1]?i(parseFloat(t)/100):i(parseFloat(t))}function s(t,e,r){return r<0?r+=1:r>1&&(r-=1),6*r<1?t+(e-t)*r*6:2*r<1?e:3*r<2?t+(e-t)*(2/3-r)*6:t}try{e.parseCSSColor=function(t){var e,i=t.replace(/ /g,"").toLowerCase();if(i in r)return r[i].slice();if("#"===i[0])return 4===i.length?(e=parseInt(i.substr(1),16))>=0&&e<=4095?[(3840&e)>>4|(3840&e)>>8,240&e|(240&e)>>4,15&e|(15&e)<<4,1]:null:7===i.length&&(e=parseInt(i.substr(1),16))>=0&&e<=16777215?[(16711680&e)>>16,(65280&e)>>8,255&e,1]:null;var u=i.indexOf("("),l=i.indexOf(")");if(-1!==u&&l+1===i.length){var p=i.substr(0,u),c=i.substr(u+1,l-(u+1)).split(","),h=1;switch(p){case"rgba":if(4!==c.length)return null;h=o(c.pop());case"rgb":return 3!==c.length?null:[a(c[0]),a(c[1]),a(c[2]),h];case"hsla":if(4!==c.length)return null;h=o(c.pop());case"hsl":if(3!==c.length)return null;var f=(parseFloat(c[0])%360+360)%360/360,y=o(c[1]),d=o(c[2]),m=d<=.5?d*(y+1):d+y-d*y,v=2*d-m;return [n(255*s(v,m,f+1/3)),n(255*s(v,m,f)),n(255*s(v,m,f-1/3)),h];default:return null}}return null};}catch(t){}})).parseCSSColor,Yt=function(t,e,r,n){void 0===n&&(n=1),this.r=t,this.g=e,this.b=r,this.a=n;};Yt.parse=function(t){if(t){if(t instanceof Yt)return t;if("string"==typeof t){var e=Ht(t);if(e)return new Yt(e[0]/255*e[3],e[1]/255*e[3],e[2]/255*e[3],e[3])}}},Yt.prototype.toString=function(){var t=this.toArray(),e=t[0],r=t[1],n=t[2],i=t[3];return "rgba("+Math.round(e)+","+Math.round(r)+","+Math.round(n)+","+i+")"},Yt.prototype.toArray=function(){var t=this.r,e=this.g,r=this.b,n=this.a;return 0===n?[0,0,0,0]:[255*t/n,255*e/n,255*r/n,n]},Yt.black=new Yt(0,0,0,1),Yt.white=new Yt(1,1,1,1),Yt.transparent=new Yt(0,0,0,0),Yt.red=new Yt(1,0,0,1);var $t=function(t,e,r){this.sensitivity=t?e?"variant":"case":e?"accent":"base",this.locale=r,this.collator=new Intl.Collator(this.locale?this.locale:[],{sensitivity:this.sensitivity,usage:"search"});};$t.prototype.compare=function(t,e){return this.collator.compare(t,e)},$t.prototype.resolvedLocale=function(){return new Intl.Collator(this.locale?this.locale:[]).resolvedOptions().locale};var Wt=function(t,e,r,n){this.text=t,this.scale=e,this.fontStack=r,this.textColor=n;},Qt=function(t){this.sections=t;};Qt.fromString=function(t){return new Qt([new Wt(t,null,null,null)])},Qt.prototype.toString=function(){return this.sections.map((function(t){return t.text})).join("")},Qt.prototype.serialize=function(){for(var t=["format"],e=0,r=this.sections;e<r.length;e+=1){var n=r[e];t.push(n.text);var i={};n.fontStack&&(i["text-font"]=["literal",n.fontStack.split(",")]),n.scale&&(i["font-scale"]=n.scale),n.textColor&&(i["text-color"]=["rgba"].concat(n.textColor.toArray())),t.push(i);}return t};var te=function(t){this.name=t.name,this.available=t.available;};function ee(t,e,r,n){return "number"==typeof t&&t>=0&&t<=255&&"number"==typeof e&&e>=0&&e<=255&&"number"==typeof r&&r>=0&&r<=255?void 0===n||"number"==typeof n&&n>=0&&n<=1?null:"Invalid rgba value ["+[t,e,r,n].join(", ")+"]: 'a' must be between 0 and 1.":"Invalid rgba value ["+("number"==typeof n?[t,e,r,n]:[t,e,r]).join(", ")+"]: 'r', 'g', and 'b' must be between 0 and 255."}function re(t){if(null===t)return Ft;if("string"==typeof t)return Lt;if("boolean"==typeof t)return Dt;if("number"==typeof t)return Ot;if(t instanceof Yt)return Ut;if(t instanceof $t)return qt;if(t instanceof Qt)return Nt;if(t instanceof te)return Kt;if(Array.isArray(t)){for(var e,r=t.length,n=0,i=t;n<i.length;n+=1){var a=re(i[n]);if(e){if(e===a)continue;e=jt;break}e=a;}return Zt(e||jt,r)}return Rt}function ne(t){var e=typeof t;return null===t?"":"string"===e||"number"===e||"boolean"===e?String(t):t instanceof Yt||t instanceof Qt||t instanceof te?t.toString():JSON.stringify(t)}te.prototype.toString=function(){return this.name},te.fromString=function(t){return new te(t)},te.prototype.serialize=function(){return ["image",this.name]};var ie=function(t,e){this.type=t,this.value=e;};ie.parse=function(t,e){if(2!==t.length)return e.error("'literal' expression requires exactly one argument, but found "+(t.length-1)+" instead.");if(!function t(e){if(null===e)return !0;if("string"==typeof e)return !0;if("boolean"==typeof e)return !0;if("number"==typeof e)return !0;if(e instanceof Yt)return !0;if(e instanceof $t)return !0;if(e instanceof Qt)return !0;if(e instanceof te)return !0;if(Array.isArray(e)){for(var r=0,n=e;r<n.length;r+=1){if(!t(n[r]))return !1}return !0}if("object"==typeof e){for(var i in e)if(!t(e[i]))return !1;return !0}return !1}(t[1]))return e.error("invalid value");var r=t[1],n=re(r),i=e.expectedType;return "array"!==n.kind||0!==n.N||!i||"array"!==i.kind||"number"==typeof i.N&&0!==i.N||(n=i),new ie(n,r)},ie.prototype.evaluate=function(){return this.value},ie.prototype.eachChild=function(){},ie.prototype.possibleOutputs=function(){return [this.value]},ie.prototype.serialize=function(){return "array"===this.type.kind||"object"===this.type.kind?["literal",this.value]:this.value instanceof Yt?["rgba"].concat(this.value.toArray()):this.value instanceof Qt?this.value.serialize():this.value};var ae=function(t){this.name="ExpressionEvaluationError",this.message=t;};ae.prototype.toJSON=function(){return this.message};var oe={string:Lt,number:Ot,boolean:Dt,object:Rt},se=function(t,e){this.type=t,this.args=e;};se.parse=function(t,e){if(t.length<2)return e.error("Expected at least one argument.");var r,n=1,i=t[0];if("array"===i){var a,o;if(t.length>2){var s=t[1];if("string"!=typeof s||!(s in oe)||"object"===s)return e.error('The item type argument of "array" must be one of string, number, boolean',1);a=oe[s],n++;}else a=jt;if(t.length>3){if(null!==t[2]&&("number"!=typeof t[2]||t[2]<0||t[2]!==Math.floor(t[2])))return e.error('The length argument to "array" must be a positive integer literal',2);o=t[2],n++;}r=Zt(a,o);}else r=oe[i];for(var u=[];n<t.length;n++){var l=e.parse(t[n],n,jt);if(!l)return null;u.push(l);}return new se(r,u)},se.prototype.evaluate=function(t){for(var e=0;e<this.args.length;e++){var r=this.args[e].evaluate(t);if(!Jt(this.type,re(r)))return r;if(e===this.args.length-1)throw new ae("Expected value to be of type "+Xt(this.type)+", but found "+Xt(re(r))+" instead.")}return null},se.prototype.eachChild=function(t){this.args.forEach(t);},se.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.args.map((function(t){return t.possibleOutputs()})))},se.prototype.serialize=function(){var t=this.type,e=[t.kind];if("array"===t.kind){var r=t.itemType;if("string"===r.kind||"number"===r.kind||"boolean"===r.kind){e.push(r.kind);var n=t.N;("number"==typeof n||this.args.length>1)&&e.push(n);}}return e.concat(this.args.map((function(t){return t.serialize()})))};var ue=function(t){this.type=Nt,this.sections=t;};ue.parse=function(t,e){if(t.length<3)return e.error("Expected at least two arguments.");if((t.length-1)%2!=0)return e.error("Expected an even number of arguments.");for(var r=[],n=1;n<t.length-1;n+=2){var i=e.parse(t[n],1,jt);if(!i)return null;var a=i.type.kind;if("string"!==a&&"value"!==a&&"null"!==a)return e.error("Formatted text type must be 'string', 'value', or 'null'.");var o=t[n+1];if("object"!=typeof o||Array.isArray(o))return e.error("Format options argument must be an object.");var s=null;if(o["font-scale"]&&!(s=e.parse(o["font-scale"],1,Ot)))return null;var u=null;if(o["text-font"]&&!(u=e.parse(o["text-font"],1,Zt(Lt))))return null;var l=null;if(o["text-color"]&&!(l=e.parse(o["text-color"],1,Ut)))return null;r.push({text:i,scale:s,font:u,textColor:l});}return new ue(r)},ue.prototype.evaluate=function(t){return new Qt(this.sections.map((function(e){return new Wt(ne(e.text.evaluate(t)),e.scale?e.scale.evaluate(t):null,e.font?e.font.evaluate(t).join(","):null,e.textColor?e.textColor.evaluate(t):null)})))},ue.prototype.eachChild=function(t){for(var e=0,r=this.sections;e<r.length;e+=1){var n=r[e];t(n.text),n.scale&&t(n.scale),n.font&&t(n.font),n.textColor&&t(n.textColor);}},ue.prototype.possibleOutputs=function(){return [void 0]},ue.prototype.serialize=function(){for(var t=["format"],e=0,r=this.sections;e<r.length;e+=1){var n=r[e];t.push(n.text.serialize());var i={};n.scale&&(i["font-scale"]=n.scale.serialize()),n.font&&(i["text-font"]=n.font.serialize()),n.textColor&&(i["text-color"]=n.textColor.serialize()),t.push(i);}return t};var le=function(t){this.type=Kt,this.input=t;};le.parse=function(t,e){if(2!==t.length)return e.error("Expected two arguments.");var r=e.parse(t[1],1,Lt);return r?new le(r):e.error("No image name provided.")},le.prototype.evaluate=function(t){var e=this.input.evaluate(t),r=!1;return t.availableImages&&t.availableImages.indexOf(e)>-1&&(r=!0),{name:e,available:r}},le.prototype.eachChild=function(t){t(this.input);},le.prototype.possibleOutputs=function(){return [void 0]},le.prototype.serialize=function(){return ["image",this.input.serialize()]};var pe={"to-boolean":Dt,"to-color":Ut,"to-number":Ot,"to-string":Lt},ce=function(t,e){this.type=t,this.args=e;};ce.parse=function(t,e){if(t.length<2)return e.error("Expected at least one argument.");var r=t[0];if(("to-boolean"===r||"to-string"===r)&&2!==t.length)return e.error("Expected one argument.");for(var n=pe[r],i=[],a=1;a<t.length;a++){var o=e.parse(t[a],a,jt);if(!o)return null;i.push(o);}return new ce(n,i)},ce.prototype.evaluate=function(t){if("boolean"===this.type.kind)return Boolean(this.args[0].evaluate(t));if("color"===this.type.kind){for(var e,r,n=0,i=this.args;n<i.length;n+=1){if(r=null,(e=i[n].evaluate(t))instanceof Yt)return e;if("string"==typeof e){var a=t.parseColor(e);if(a)return a}else if(Array.isArray(e)&&!(r=e.length<3||e.length>4?"Invalid rbga value "+JSON.stringify(e)+": expected an array containing either three or four numeric values.":ee(e[0],e[1],e[2],e[3])))return new Yt(e[0]/255,e[1]/255,e[2]/255,e[3])}throw new ae(r||"Could not parse color from value '"+("string"==typeof e?e:String(JSON.stringify(e)))+"'")}if("number"===this.type.kind){for(var o=null,s=0,u=this.args;s<u.length;s+=1){if(null===(o=u[s].evaluate(t)))return 0;var l=Number(o);if(!isNaN(l))return l}throw new ae("Could not convert "+JSON.stringify(o)+" to number.")}if("formatted"===this.type.kind)return Qt.fromString(ne(this.args[0].evaluate(t)));if("image"===this.type.kind){var p=ne(this.args[0].evaluate(t));return te.fromString({name:p,available:!1})}return ne(this.args[0].evaluate(t))},ce.prototype.eachChild=function(t){this.args.forEach(t);},ce.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.args.map((function(t){return t.possibleOutputs()})))},ce.prototype.serialize=function(){if("formatted"===this.type.kind)return new ue([{text:this.args[0],scale:null,font:null,textColor:null}]).serialize();if("image"===this.type.kind)return new le(this.args[0]).serialize();var t=["to-"+this.type.kind];return this.eachChild((function(e){t.push(e.serialize());})),t};var he=["Unknown","Point","LineString","Polygon"],fe=function(){this.globals=null,this.feature=null,this.featureState=null,this.formattedSection=null,this._parseColorCache={},this.availableImages=null;};fe.prototype.id=function(){return this.feature&&"id"in this.feature?this.feature.id:null},fe.prototype.geometryType=function(){return this.feature?"number"==typeof this.feature.type?he[this.feature.type]:this.feature.type:null},fe.prototype.properties=function(){return this.feature&&this.feature.properties||{}},fe.prototype.parseColor=function(t){var e=this._parseColorCache[t];return e||(e=this._parseColorCache[t]=Yt.parse(t)),e};var ye=function(t,e,r,n){this.name=t,this.type=e,this._evaluate=r,this.args=n;};ye.prototype.evaluate=function(t){return this._evaluate(t,this.args)},ye.prototype.eachChild=function(t){this.args.forEach(t);},ye.prototype.possibleOutputs=function(){return [void 0]},ye.prototype.serialize=function(){return [this.name].concat(this.args.map((function(t){return t.serialize()})))},ye.parse=function(t,e){var r,n=t[0],i=ye.definitions[n];if(!i)return e.error('Unknown expression "'+n+'". If you wanted a literal array, use ["literal", [...]].',0);for(var a=Array.isArray(i)?i[0]:i.type,o=Array.isArray(i)?[[i[1],i[2]]]:i.overloads,s=o.filter((function(e){var r=e[0];return !Array.isArray(r)||r.length===t.length-1})),u=null,l=0,p=s;l<p.length;l+=1){var c=p[l],h=c[0],f=c[1];u=new be(e.registry,e.path,null,e.scope);for(var y=[],d=!1,m=1;m<t.length;m++){var v=t[m],g=Array.isArray(h)?h[m-1]:h.type,x=u.parse(v,1+y.length,g);if(!x){d=!0;break}y.push(x);}if(!d)if(Array.isArray(h)&&h.length!==y.length)u.error("Expected "+h.length+" arguments, but found "+y.length+" instead.");else{for(var b=0;b<y.length;b++){var _=Array.isArray(h)?h[b]:h.type,w=y[b];u.concat(b+1).checkSubtype(_,w.type);}if(0===u.errors.length)return new ye(n,a,f,y)}}if(1===s.length)(r=e.errors).push.apply(r,u.errors);else{for(var A=(s.length?s:o).map((function(t){var e,r=t[0];return e=r,Array.isArray(e)?"("+e.map(Xt).join(", ")+")":"("+Xt(e.type)+"...)"})).join(" | "),k=[],S=1;S<t.length;S++){var z=e.parse(t[S],1+k.length);if(!z)return null;k.push(Xt(z.type));}e.error("Expected arguments of type "+A+", but found ("+k.join(", ")+") instead.");}return null},ye.register=function(t,e){for(var r in ye.definitions=e,e)t[r]=ye;};var de=function(t,e,r){this.type=qt,this.locale=r,this.caseSensitive=t,this.diacriticSensitive=e;};function me(t){if(t instanceof ye){if("get"===t.name&&1===t.args.length)return !1;if("feature-state"===t.name)return !1;if("has"===t.name&&1===t.args.length)return !1;if("properties"===t.name||"geometry-type"===t.name||"id"===t.name)return !1;if(/^filter-/.test(t.name))return !1}var e=!0;return t.eachChild((function(t){e&&!me(t)&&(e=!1);})),e}function ve(t){if(t instanceof ye&&"feature-state"===t.name)return !1;var e=!0;return t.eachChild((function(t){e&&!ve(t)&&(e=!1);})),e}function ge(t,e){if(t instanceof ye&&e.indexOf(t.name)>=0)return !1;var r=!0;return t.eachChild((function(t){r&&!ge(t,e)&&(r=!1);})),r}de.parse=function(t,e){if(2!==t.length)return e.error("Expected one argument.");var r=t[1];if("object"!=typeof r||Array.isArray(r))return e.error("Collator options argument must be an object.");var n=e.parse(void 0!==r["case-sensitive"]&&r["case-sensitive"],1,Dt);if(!n)return null;var i=e.parse(void 0!==r["diacritic-sensitive"]&&r["diacritic-sensitive"],1,Dt);if(!i)return null;var a=null;return r.locale&&!(a=e.parse(r.locale,1,Lt))?null:new de(n,i,a)},de.prototype.evaluate=function(t){return new $t(this.caseSensitive.evaluate(t),this.diacriticSensitive.evaluate(t),this.locale?this.locale.evaluate(t):null)},de.prototype.eachChild=function(t){t(this.caseSensitive),t(this.diacriticSensitive),this.locale&&t(this.locale);},de.prototype.possibleOutputs=function(){return [void 0]},de.prototype.serialize=function(){var t={};return t["case-sensitive"]=this.caseSensitive.serialize(),t["diacritic-sensitive"]=this.diacriticSensitive.serialize(),this.locale&&(t.locale=this.locale.serialize()),["collator",t]};var xe=function(t,e){this.type=e.type,this.name=t,this.boundExpression=e;};xe.parse=function(t,e){if(2!==t.length||"string"!=typeof t[1])return e.error("'var' expression requires exactly one string literal argument.");var r=t[1];return e.scope.has(r)?new xe(r,e.scope.get(r)):e.error('Unknown variable "'+r+'". Make sure "'+r+'" has been bound in an enclosing "let" expression before using it.',1)},xe.prototype.evaluate=function(t){return this.boundExpression.evaluate(t)},xe.prototype.eachChild=function(){},xe.prototype.possibleOutputs=function(){return [void 0]},xe.prototype.serialize=function(){return ["var",this.name]};var be=function(t,e,r,n,i){void 0===e&&(e=[]),void 0===n&&(n=new Vt),void 0===i&&(i=[]),this.registry=t,this.path=e,this.key=e.map((function(t){return "["+t+"]"})).join(""),this.scope=n,this.errors=i,this.expectedType=r;};function _e(t,e){for(var r,n,i=t.length-1,a=0,o=i,s=0;a<=o;)if(r=t[s=Math.floor((a+o)/2)],n=t[s+1],r<=e){if(s===i||e<n)return s;a=s+1;}else{if(!(r>e))throw new ae("Input is not a number.");o=s-1;}return 0}be.prototype.parse=function(t,e,r,n,i){return void 0===i&&(i={}),e?this.concat(e,r,n)._parse(t,i):this._parse(t,i)},be.prototype._parse=function(t,e){function r(t,e,r){return "assert"===r?new se(e,[t]):"coerce"===r?new ce(e,[t]):t}if(null!==t&&"string"!=typeof t&&"boolean"!=typeof t&&"number"!=typeof t||(t=["literal",t]),Array.isArray(t)){if(0===t.length)return this.error('Expected an array with at least one element. If you wanted a literal array, use ["literal", []].');var n=t[0];if("string"!=typeof n)return this.error("Expression name must be a string, but found "+typeof n+' instead. If you wanted a literal array, use ["literal", [...]].',0),null;var i=this.registry[n];if(i){var a=i.parse(t,this);if(!a)return null;if(this.expectedType){var o=this.expectedType,s=a.type;if("string"!==o.kind&&"number"!==o.kind&&"boolean"!==o.kind&&"object"!==o.kind&&"array"!==o.kind||"value"!==s.kind)if("color"!==o.kind&&"formatted"!==o.kind&&"image"!==o.kind||"value"!==s.kind&&"string"!==s.kind){if(this.checkSubtype(o,s))return null}else a=r(a,o,e.typeAnnotation||"coerce");else a=r(a,o,e.typeAnnotation||"assert");}if(!(a instanceof ie)&&"image"!==a.type.kind&&function t(e){if(e instanceof xe)return t(e.boundExpression);if(e instanceof ye&&"error"===e.name)return !1;if(e instanceof de)return !1;var r=e instanceof ce||e instanceof se;var n=!0;e.eachChild((function(e){n=r?n&&t(e):n&&e instanceof ie;}));if(!n)return !1;return me(e)&&ge(e,["zoom","heatmap-density","line-progress","accumulated","is-supported-script"])}(a)){var u=new fe;try{a=new ie(a.type,a.evaluate(u));}catch(t){return this.error(t.message),null}}return a}return this.error('Unknown expression "'+n+'". If you wanted a literal array, use ["literal", [...]].',0)}return void 0===t?this.error("'undefined' value invalid. Use null instead."):"object"==typeof t?this.error('Bare objects invalid. Use ["literal", {...}] instead.'):this.error("Expected an array, but found "+typeof t+" instead.")},be.prototype.concat=function(t,e,r){var n="number"==typeof t?this.path.concat(t):this.path,i=r?this.scope.concat(r):this.scope;return new be(this.registry,n,e||null,i,this.errors)},be.prototype.error=function(t){for(var e=[],r=arguments.length-1;r-- >0;)e[r]=arguments[r+1];var n=""+this.key+e.map((function(t){return "["+t+"]"})).join("");this.errors.push(new Tt(n,t));},be.prototype.checkSubtype=function(t,e){var r=Jt(t,e);return r&&this.error(r),r};var we=function(t,e,r){this.type=t,this.input=e,this.labels=[],this.outputs=[];for(var n=0,i=r;n<i.length;n+=1){var a=i[n],o=a[0],s=a[1];this.labels.push(o),this.outputs.push(s);}};function Ae(t,e,r){return t*(1-r)+e*r}we.parse=function(t,e){if(t.length-1<4)return e.error("Expected at least 4 arguments, but found only "+(t.length-1)+".");if((t.length-1)%2!=0)return e.error("Expected an even number of arguments.");var r=e.parse(t[1],1,Ot);if(!r)return null;var n=[],i=null;e.expectedType&&"value"!==e.expectedType.kind&&(i=e.expectedType);for(var a=1;a<t.length;a+=2){var o=1===a?-1/0:t[a],s=t[a+1],u=a,l=a+1;if("number"!=typeof o)return e.error('Input/output pairs for "step" expressions must be defined using literal numeric values (not computed expressions) for the input values.',u);if(n.length&&n[n.length-1][0]>=o)return e.error('Input/output pairs for "step" expressions must be arranged with input values in strictly ascending order.',u);var p=e.parse(s,l,i);if(!p)return null;i=i||p.type,n.push([o,p]);}return new we(i,r,n)},we.prototype.evaluate=function(t){var e=this.labels,r=this.outputs;if(1===e.length)return r[0].evaluate(t);var n=this.input.evaluate(t);if(n<=e[0])return r[0].evaluate(t);var i=e.length;return n>=e[i-1]?r[i-1].evaluate(t):r[_e(e,n)].evaluate(t)},we.prototype.eachChild=function(t){t(this.input);for(var e=0,r=this.outputs;e<r.length;e+=1){t(r[e]);}},we.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.outputs.map((function(t){return t.possibleOutputs()})))},we.prototype.serialize=function(){for(var t=["step",this.input.serialize()],e=0;e<this.labels.length;e++)e>0&&t.push(this.labels[e]),t.push(this.outputs[e].serialize());return t};var ke=Object.freeze({number:Ae,color:function(t,e,r){return new Yt(Ae(t.r,e.r,r),Ae(t.g,e.g,r),Ae(t.b,e.b,r),Ae(t.a,e.a,r))},array:function(t,e,r){return t.map((function(t,n){return Ae(t,e[n],r)}))}}),Se=.95047,ze=1,Ie=1.08883,Ce=4/29,Be=6/29,Ee=3*Be*Be,Me=Be*Be*Be,Pe=Math.PI/180,Te=180/Math.PI;function Ve(t){return t>Me?Math.pow(t,1/3):t/Ee+Ce}function Fe(t){return t>Be?t*t*t:Ee*(t-Ce)}function Oe(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function Le(t){return (t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function De(t){var e=Le(t.r),r=Le(t.g),n=Le(t.b),i=Ve((.4124564*e+.3575761*r+.1804375*n)/Se),a=Ve((.2126729*e+.7151522*r+.072175*n)/ze);return {l:116*a-16,a:500*(i-a),b:200*(a-Ve((.0193339*e+.119192*r+.9503041*n)/Ie)),alpha:t.a}}function Ue(t){var e=(t.l+16)/116,r=isNaN(t.a)?e:e+t.a/500,n=isNaN(t.b)?e:e-t.b/200;return e=ze*Fe(e),r=Se*Fe(r),n=Ie*Fe(n),new Yt(Oe(3.2404542*r-1.5371385*e-.4985314*n),Oe(-.969266*r+1.8760108*e+.041556*n),Oe(.0556434*r-.2040259*e+1.0572252*n),t.alpha)}function Re(t,e,r){var n=e-t;return t+r*(n>180||n<-180?n-360*Math.round(n/360):n)}var je={forward:De,reverse:Ue,interpolate:function(t,e,r){return {l:Ae(t.l,e.l,r),a:Ae(t.a,e.a,r),b:Ae(t.b,e.b,r),alpha:Ae(t.alpha,e.alpha,r)}}},qe={forward:function(t){var e=De(t),r=e.l,n=e.a,i=e.b,a=Math.atan2(i,n)*Te;return {h:a<0?a+360:a,c:Math.sqrt(n*n+i*i),l:r,alpha:t.a}},reverse:function(t){var e=t.h*Pe,r=t.c;return Ue({l:t.l,a:Math.cos(e)*r,b:Math.sin(e)*r,alpha:t.alpha})},interpolate:function(t,e,r){return {h:Re(t.h,e.h,r),c:Ae(t.c,e.c,r),l:Ae(t.l,e.l,r),alpha:Ae(t.alpha,e.alpha,r)}}},Ne=Object.freeze({lab:je,hcl:qe}),Ke=function(t,e,r,n,i){this.type=t,this.operator=e,this.interpolation=r,this.input=n,this.labels=[],this.outputs=[];for(var a=0,o=i;a<o.length;a+=1){var s=o[a],u=s[0],l=s[1];this.labels.push(u),this.outputs.push(l);}};function Ze(t,e,r,n){var i=n-r,a=t-r;return 0===i?0:1===e?a/i:(Math.pow(e,a)-1)/(Math.pow(e,i)-1)}Ke.interpolationFactor=function(t,e,n,i){var a=0;if("exponential"===t.name)a=Ze(e,t.base,n,i);else if("linear"===t.name)a=Ze(e,1,n,i);else if("cubic-bezier"===t.name){var o=t.controlPoints;a=new r(o[0],o[1],o[2],o[3]).solve(Ze(e,1,n,i));}return a},Ke.parse=function(t,e){var r=t[0],n=t[1],i=t[2],a=t.slice(3);if(!Array.isArray(n)||0===n.length)return e.error("Expected an interpolation type expression.",1);if("linear"===n[0])n={name:"linear"};else if("exponential"===n[0]){var o=n[1];if("number"!=typeof o)return e.error("Exponential interpolation requires a numeric base.",1,1);n={name:"exponential",base:o};}else{if("cubic-bezier"!==n[0])return e.error("Unknown interpolation type "+String(n[0]),1,0);var s=n.slice(1);if(4!==s.length||s.some((function(t){return "number"!=typeof t||t<0||t>1})))return e.error("Cubic bezier interpolation requires four numeric arguments with values between 0 and 1.",1);n={name:"cubic-bezier",controlPoints:s};}if(t.length-1<4)return e.error("Expected at least 4 arguments, but found only "+(t.length-1)+".");if((t.length-1)%2!=0)return e.error("Expected an even number of arguments.");if(!(i=e.parse(i,2,Ot)))return null;var u=[],l=null;"interpolate-hcl"===r||"interpolate-lab"===r?l=Ut:e.expectedType&&"value"!==e.expectedType.kind&&(l=e.expectedType);for(var p=0;p<a.length;p+=2){var c=a[p],h=a[p+1],f=p+3,y=p+4;if("number"!=typeof c)return e.error('Input/output pairs for "interpolate" expressions must be defined using literal numeric values (not computed expressions) for the input values.',f);if(u.length&&u[u.length-1][0]>=c)return e.error('Input/output pairs for "interpolate" expressions must be arranged with input values in strictly ascending order.',f);var d=e.parse(h,y,l);if(!d)return null;l=l||d.type,u.push([c,d]);}return "number"===l.kind||"color"===l.kind||"array"===l.kind&&"number"===l.itemType.kind&&"number"==typeof l.N?new Ke(l,r,n,i,u):e.error("Type "+Xt(l)+" is not interpolatable.")},Ke.prototype.evaluate=function(t){var e=this.labels,r=this.outputs;if(1===e.length)return r[0].evaluate(t);var n=this.input.evaluate(t);if(n<=e[0])return r[0].evaluate(t);var i=e.length;if(n>=e[i-1])return r[i-1].evaluate(t);var a=_e(e,n),o=e[a],s=e[a+1],u=Ke.interpolationFactor(this.interpolation,n,o,s),l=r[a].evaluate(t),p=r[a+1].evaluate(t);return "interpolate"===this.operator?ke[this.type.kind.toLowerCase()](l,p,u):"interpolate-hcl"===this.operator?qe.reverse(qe.interpolate(qe.forward(l),qe.forward(p),u)):je.reverse(je.interpolate(je.forward(l),je.forward(p),u))},Ke.prototype.eachChild=function(t){t(this.input);for(var e=0,r=this.outputs;e<r.length;e+=1){t(r[e]);}},Ke.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.outputs.map((function(t){return t.possibleOutputs()})))},Ke.prototype.serialize=function(){var t;t="linear"===this.interpolation.name?["linear"]:"exponential"===this.interpolation.name?1===this.interpolation.base?["linear"]:["exponential",this.interpolation.base]:["cubic-bezier"].concat(this.interpolation.controlPoints);for(var e=[this.operator,t,this.input.serialize()],r=0;r<this.labels.length;r++)e.push(this.labels[r],this.outputs[r].serialize());return e};var Xe=function(t,e){this.type=t,this.args=e;};Xe.parse=function(t,e){if(t.length<2)return e.error("Expectected at least one argument.");var r=null,n=e.expectedType;n&&"value"!==n.kind&&(r=n);for(var i=[],a=0,o=t.slice(1);a<o.length;a+=1){var s=o[a],u=e.parse(s,1+i.length,r,void 0,{typeAnnotation:"omit"});if(!u)return null;r=r||u.type,i.push(u);}var l=n&&i.some((function(t){return Jt(n,t.type)}));return new Xe(l?jt:r,i)},Xe.prototype.evaluate=function(t){for(var e,r=null,n=0,i=0,a=this.args;i<a.length;i+=1){var o=a[i];if(n++,r=o.evaluate(t),"image"!==o.type.kind||r.available||(e||(e=o.evaluate(t).name),r=null,n===this.args.length&&(r=e)),null!==r)break}return r},Xe.prototype.eachChild=function(t){this.args.forEach(t);},Xe.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.args.map((function(t){return t.possibleOutputs()})))},Xe.prototype.serialize=function(){var t=["coalesce"];return this.eachChild((function(e){t.push(e.serialize());})),t};var Ge=function(t,e){this.type=e.type,this.bindings=[].concat(t),this.result=e;};Ge.prototype.evaluate=function(t){return this.result.evaluate(t)},Ge.prototype.eachChild=function(t){for(var e=0,r=this.bindings;e<r.length;e+=1){t(r[e][1]);}t(this.result);},Ge.parse=function(t,e){if(t.length<4)return e.error("Expected at least 3 arguments, but found "+(t.length-1)+" instead.");for(var r=[],n=1;n<t.length-1;n+=2){var i=t[n];if("string"!=typeof i)return e.error("Expected string, but found "+typeof i+" instead.",n);if(/[^a-zA-Z0-9_]/.test(i))return e.error("Variable names must contain only alphanumeric characters or '_'.",n);var a=e.parse(t[n+1],n+1);if(!a)return null;r.push([i,a]);}var o=e.parse(t[t.length-1],t.length-1,e.expectedType,r);return o?new Ge(r,o):null},Ge.prototype.possibleOutputs=function(){return this.result.possibleOutputs()},Ge.prototype.serialize=function(){for(var t=["let"],e=0,r=this.bindings;e<r.length;e+=1){var n=r[e],i=n[0],a=n[1];t.push(i,a.serialize());}return t.push(this.result.serialize()),t};var Je=function(t,e,r){this.type=t,this.index=e,this.input=r;};Je.parse=function(t,e){if(3!==t.length)return e.error("Expected 2 arguments, but found "+(t.length-1)+" instead.");var r=e.parse(t[1],1,Ot),n=e.parse(t[2],2,Zt(e.expectedType||jt));if(!r||!n)return null;var i=n.type;return new Je(i.itemType,r,n)},Je.prototype.evaluate=function(t){var e=this.index.evaluate(t),r=this.input.evaluate(t);if(e<0)throw new ae("Array index out of bounds: "+e+" < 0.");if(e>=r.length)throw new ae("Array index out of bounds: "+e+" > "+(r.length-1)+".");if(e!==Math.floor(e))throw new ae("Array index must be an integer, but found "+e+" instead.");return r[e]},Je.prototype.eachChild=function(t){t(this.index),t(this.input);},Je.prototype.possibleOutputs=function(){return [void 0]},Je.prototype.serialize=function(){return ["at",this.index.serialize(),this.input.serialize()]};var He=function(t,e,r,n,i,a){this.inputType=t,this.type=e,this.input=r,this.cases=n,this.outputs=i,this.otherwise=a;};He.parse=function(t,e){if(t.length<5)return e.error("Expected at least 4 arguments, but found only "+(t.length-1)+".");if(t.length%2!=1)return e.error("Expected an even number of arguments.");var r,n;e.expectedType&&"value"!==e.expectedType.kind&&(n=e.expectedType);for(var i={},a=[],o=2;o<t.length-1;o+=2){var s=t[o],u=t[o+1];Array.isArray(s)||(s=[s]);var l=e.concat(o);if(0===s.length)return l.error("Expected at least one branch label.");for(var p=0,c=s;p<c.length;p+=1){var h=c[p];if("number"!=typeof h&&"string"!=typeof h)return l.error("Branch labels must be numbers or strings.");if("number"==typeof h&&Math.abs(h)>Number.MAX_SAFE_INTEGER)return l.error("Branch labels must be integers no larger than "+Number.MAX_SAFE_INTEGER+".");if("number"==typeof h&&Math.floor(h)!==h)return l.error("Numeric branch labels must be integer values.");if(r){if(l.checkSubtype(r,re(h)))return null}else r=re(h);if(void 0!==i[String(h)])return l.error("Branch labels must be unique.");i[String(h)]=a.length;}var f=e.parse(u,o,n);if(!f)return null;n=n||f.type,a.push(f);}var y=e.parse(t[1],1,jt);if(!y)return null;var d=e.parse(t[t.length-1],t.length-1,n);return d?"value"!==y.type.kind&&e.concat(1).checkSubtype(r,y.type)?null:new He(r,n,y,i,a,d):null},He.prototype.evaluate=function(t){var e=this.input.evaluate(t);return (re(e)===this.inputType&&this.outputs[this.cases[e]]||this.otherwise).evaluate(t)},He.prototype.eachChild=function(t){t(this.input),this.outputs.forEach(t),t(this.otherwise);},He.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.outputs.map((function(t){return t.possibleOutputs()}))).concat(this.otherwise.possibleOutputs())},He.prototype.serialize=function(){for(var t=this,e=["match",this.input.serialize()],r=[],n={},i=0,a=Object.keys(this.cases).sort();i<a.length;i+=1){var o=a[i];void 0===(c=n[this.cases[o]])?(n[this.cases[o]]=r.length,r.push([this.cases[o],[o]])):r[c][1].push(o);}for(var s=function(e){return "number"===t.inputType.kind?Number(e):e},u=0,l=r;u<l.length;u+=1){var p=l[u],c=p[0],h=p[1];1===h.length?e.push(s(h[0])):e.push(h.map(s)),e.push(this.outputs[outputIndex$1].serialize());}return e.push(this.otherwise.serialize()),e};var Ye=function(t,e,r){this.type=t,this.branches=e,this.otherwise=r;};function $e(t,e){return "=="===t||"!="===t?"boolean"===e.kind||"string"===e.kind||"number"===e.kind||"null"===e.kind||"value"===e.kind:"string"===e.kind||"number"===e.kind||"value"===e.kind}function We(t,e,r,n){return 0===n.compare(e,r)}function Qe(t,e,r){var n="=="!==t&&"!="!==t;return function(){function i(t,e,r){this.type=Dt,this.lhs=t,this.rhs=e,this.collator=r,this.hasUntypedArgument="value"===t.type.kind||"value"===e.type.kind;}return i.parse=function(t,e){if(3!==t.length&&4!==t.length)return e.error("Expected two or three arguments.");var r=t[0],a=e.parse(t[1],1,jt);if(!a)return null;if(!$e(r,a.type))return e.concat(1).error('"'+r+"\" comparisons are not supported for type '"+Xt(a.type)+"'.");var o=e.parse(t[2],2,jt);if(!o)return null;if(!$e(r,o.type))return e.concat(2).error('"'+r+"\" comparisons are not supported for type '"+Xt(o.type)+"'.");if(a.type.kind!==o.type.kind&&"value"!==a.type.kind&&"value"!==o.type.kind)return e.error("Cannot compare types '"+Xt(a.type)+"' and '"+Xt(o.type)+"'.");n&&("value"===a.type.kind&&"value"!==o.type.kind?a=new se(o.type,[a]):"value"!==a.type.kind&&"value"===o.type.kind&&(o=new se(a.type,[o])));var s=null;if(4===t.length){if("string"!==a.type.kind&&"string"!==o.type.kind&&"value"!==a.type.kind&&"value"!==o.type.kind)return e.error("Cannot use collator to compare non-string types.");if(!(s=e.parse(t[3],3,qt)))return null}return new i(a,o,s)},i.prototype.evaluate=function(i){var a=this.lhs.evaluate(i),o=this.rhs.evaluate(i);if(n&&this.hasUntypedArgument){var s=re(a),u=re(o);if(s.kind!==u.kind||"string"!==s.kind&&"number"!==s.kind)throw new ae('Expected arguments for "'+t+'" to be (string, string) or (number, number), but found ('+s.kind+", "+u.kind+") instead.")}if(this.collator&&!n&&this.hasUntypedArgument){var l=re(a),p=re(o);if("string"!==l.kind||"string"!==p.kind)return e(i,a,o)}return this.collator?r(i,a,o,this.collator.evaluate(i)):e(i,a,o)},i.prototype.eachChild=function(t){t(this.lhs),t(this.rhs),this.collator&&t(this.collator);},i.prototype.possibleOutputs=function(){return [!0,!1]},i.prototype.serialize=function(){var e=[t];return this.eachChild((function(t){e.push(t.serialize());})),e},i}()}Ye.parse=function(t,e){if(t.length<4)return e.error("Expected at least 3 arguments, but found only "+(t.length-1)+".");if(t.length%2!=0)return e.error("Expected an odd number of arguments.");var r;e.expectedType&&"value"!==e.expectedType.kind&&(r=e.expectedType);for(var n=[],i=1;i<t.length-1;i+=2){var a=e.parse(t[i],i,Dt);if(!a)return null;var o=e.parse(t[i+1],i+1,r);if(!o)return null;n.push([a,o]),r=r||o.type;}var s=e.parse(t[t.length-1],t.length-1,r);return s?new Ye(r,n,s):null},Ye.prototype.evaluate=function(t){for(var e=0,r=this.branches;e<r.length;e+=1){var n=r[e],i=n[0],a=n[1];if(i.evaluate(t))return a.evaluate(t)}return this.otherwise.evaluate(t)},Ye.prototype.eachChild=function(t){for(var e=0,r=this.branches;e<r.length;e+=1){var n=r[e],i=n[0],a=n[1];t(i),t(a);}t(this.otherwise);},Ye.prototype.possibleOutputs=function(){var t;return (t=[]).concat.apply(t,this.branches.map((function(t){t[0];return t[1].possibleOutputs()}))).concat(this.otherwise.possibleOutputs())},Ye.prototype.serialize=function(){var t=["case"];return this.eachChild((function(e){t.push(e.serialize());})),t};var tr=Qe("==",(function(t,e,r){return e===r}),We),er=Qe("!=",(function(t,e,r){return e!==r}),(function(t,e,r,n){return !We(0,e,r,n)})),rr=Qe("<",(function(t,e,r){return e<r}),(function(t,e,r,n){return n.compare(e,r)<0})),nr=Qe(">",(function(t,e,r){return e>r}),(function(t,e,r,n){return n.compare(e,r)>0})),ir=Qe("<=",(function(t,e,r){return e<=r}),(function(t,e,r,n){return n.compare(e,r)<=0})),ar=Qe(">=",(function(t,e,r){return e>=r}),(function(t,e,r,n){return n.compare(e,r)>=0})),or=function(t,e,r,n,i){this.type=Lt,this.number=t,this.locale=e,this.currency=r,this.minFractionDigits=n,this.maxFractionDigits=i;};or.parse=function(t,e){if(3!==t.length)return e.error("Expected two arguments.");var r=e.parse(t[1],1,Ot);if(!r)return null;var n=t[2];if("object"!=typeof n||Array.isArray(n))return e.error("NumberFormat options argument must be an object.");var i=null;if(n.locale&&!(i=e.parse(n.locale,1,Lt)))return null;var a=null;if(n.currency&&!(a=e.parse(n.currency,1,Lt)))return null;var o=null;if(n["min-fraction-digits"]&&!(o=e.parse(n["min-fraction-digits"],1,Ot)))return null;var s=null;return n["max-fraction-digits"]&&!(s=e.parse(n["max-fraction-digits"],1,Ot))?null:new or(r,i,a,o,s)},or.prototype.evaluate=function(t){return new Intl.NumberFormat(this.locale?this.locale.evaluate(t):[],{style:this.currency?"currency":"decimal",currency:this.currency?this.currency.evaluate(t):void 0,minimumFractionDigits:this.minFractionDigits?this.minFractionDigits.evaluate(t):void 0,maximumFractionDigits:this.maxFractionDigits?this.maxFractionDigits.evaluate(t):void 0}).format(this.number.evaluate(t))},or.prototype.eachChild=function(t){t(this.number),this.locale&&t(this.locale),this.currency&&t(this.currency),this.minFractionDigits&&t(this.minFractionDigits),this.maxFractionDigits&&t(this.maxFractionDigits);},or.prototype.possibleOutputs=function(){return [void 0]},or.prototype.serialize=function(){var t={};return this.locale&&(t.locale=this.locale.serialize()),this.currency&&(t.currency=this.currency.serialize()),this.minFractionDigits&&(t["min-fraction-digits"]=this.minFractionDigits.serialize()),this.maxFractionDigits&&(t["max-fraction-digits"]=this.maxFractionDigits.serialize()),["number-format",this.number.serialize(),t]};var sr=function(t){this.type=Ot,this.input=t;};sr.parse=function(t,e){if(2!==t.length)return e.error("Expected 1 argument, but found "+(t.length-1)+" instead.");var r=e.parse(t[1],1);return r?"array"!==r.type.kind&&"string"!==r.type.kind&&"value"!==r.type.kind?e.error("Expected argument of type string or array, but found "+Xt(r.type)+" instead."):new sr(r):null},sr.prototype.evaluate=function(t){var e=this.input.evaluate(t);if("string"==typeof e)return e.length;if(Array.isArray(e))return e.length;throw new ae("Expected value to be of type string or array, but found "+Xt(re(e))+" instead.")},sr.prototype.eachChild=function(t){t(this.input);},sr.prototype.possibleOutputs=function(){return [void 0]},sr.prototype.serialize=function(){var t=["length"];return this.eachChild((function(e){t.push(e.serialize());})),t};var ur={"==":tr,"!=":er,">":nr,"<":rr,">=":ar,"<=":ir,array:se,at:Je,boolean:se,case:Ye,coalesce:Xe,collator:de,format:ue,image:le,interpolate:Ke,"interpolate-hcl":Ke,"interpolate-lab":Ke,length:sr,let:Ge,literal:ie,match:He,number:se,"number-format":or,object:se,step:we,string:se,"to-boolean":ce,"to-color":ce,"to-number":ce,"to-string":ce,var:xe};function lr(t,e){var r=e[0],n=e[1],i=e[2],a=e[3];r=r.evaluate(t),n=n.evaluate(t),i=i.evaluate(t);var o=a?a.evaluate(t):1,s=ee(r,n,i,o);if(s)throw new ae(s);return new Yt(r/255*o,n/255*o,i/255*o,o)}function pr(t,e){return t in e}function cr(t,e){var r=e[t];return void 0===r?null:r}function hr(t){return {type:t}}function fr(t){return {result:"success",value:t}}function yr(t){return {result:"error",value:t}}function dr(t){return "data-driven"===t["property-type"]||"cross-faded-data-driven"===t["property-type"]}function mr(t){return !!t.expression&&t.expression.parameters.indexOf("zoom")>-1}function vr(t){return !!t.expression&&t.expression.interpolated}function gr(t){return t instanceof Number?"number":t instanceof String?"string":t instanceof Boolean?"boolean":Array.isArray(t)?"array":null===t?"null":typeof t}function xr(t){return "object"==typeof t&&null!==t&&!Array.isArray(t)}function br(t){return t}function _r(t,e,r){return void 0!==t?t:void 0!==e?e:void 0!==r?r:void 0}function wr(t,e,r,n,i){return _r(typeof r===i?n[r]:void 0,t.default,e.default)}function Ar(t,e,r){if("number"!==gr(r))return _r(t.default,e.default);var n=t.stops.length;if(1===n)return t.stops[0][1];if(r<=t.stops[0][0])return t.stops[0][1];if(r>=t.stops[n-1][0])return t.stops[n-1][1];var i=_e(t.stops.map((function(t){return t[0]})),r);return t.stops[i][1]}function kr(t,e,r){var n=void 0!==t.base?t.base:1;if("number"!==gr(r))return _r(t.default,e.default);var i=t.stops.length;if(1===i)return t.stops[0][1];if(r<=t.stops[0][0])return t.stops[0][1];if(r>=t.stops[i-1][0])return t.stops[i-1][1];var a=_e(t.stops.map((function(t){return t[0]})),r),o=function(t,e,r,n){var i=n-r,a=t-r;return 0===i?0:1===e?a/i:(Math.pow(e,a)-1)/(Math.pow(e,i)-1)}(r,n,t.stops[a][0],t.stops[a+1][0]),s=t.stops[a][1],u=t.stops[a+1][1],l=ke[e.type]||br;if(t.colorSpace&&"rgb"!==t.colorSpace){var p=Ne[t.colorSpace];l=function(t,e){return p.reverse(p.interpolate(p.forward(t),p.forward(e),o))};}return "function"==typeof s.evaluate?{evaluate:function(){for(var t=[],e=arguments.length;e--;)t[e]=arguments[e];var r=s.evaluate.apply(void 0,t),n=u.evaluate.apply(void 0,t);if(void 0!==r&&void 0!==n)return l(r,n,o)}}:l(s,u,o)}function Sr(t,e,r){return "color"===e.type?r=Yt.parse(r):"formatted"===e.type?r=Qt.fromString(r.toString()):"image"===e.type?r=te.fromString({name:r.toString(),available:!1}):gr(r)===e.type||"enum"===e.type&&e.values[r]||(r=void 0),_r(r,t.default,e.default)}ye.register(ur,{error:[{kind:"error"},[Lt],function(t,e){var r=e[0];throw new ae(r.evaluate(t))}],typeof:[Lt,[jt],function(t,e){return Xt(re(e[0].evaluate(t)))}],"to-rgba":[Zt(Ot,4),[Ut],function(t,e){return e[0].evaluate(t).toArray()}],rgb:[Ut,[Ot,Ot,Ot],lr],rgba:[Ut,[Ot,Ot,Ot,Ot],lr],has:{type:Dt,overloads:[[[Lt],function(t,e){return pr(e[0].evaluate(t),t.properties())}],[[Lt,Rt],function(t,e){var r=e[0],n=e[1];return pr(r.evaluate(t),n.evaluate(t))}]]},get:{type:jt,overloads:[[[Lt],function(t,e){return cr(e[0].evaluate(t),t.properties())}],[[Lt,Rt],function(t,e){var r=e[0],n=e[1];return cr(r.evaluate(t),n.evaluate(t))}]]},"feature-state":[jt,[Lt],function(t,e){return cr(e[0].evaluate(t),t.featureState||{})}],properties:[Rt,[],function(t){return t.properties()}],"geometry-type":[Lt,[],function(t){return t.geometryType()}],id:[jt,[],function(t){return t.id()}],zoom:[Ot,[],function(t){return t.globals.zoom}],"heatmap-density":[Ot,[],function(t){return t.globals.heatmapDensity||0}],"line-progress":[Ot,[],function(t){return t.globals.lineProgress||0}],accumulated:[jt,[],function(t){return void 0===t.globals.accumulated?null:t.globals.accumulated}],"+":[Ot,hr(Ot),function(t,e){for(var r=0,n=0,i=e;n<i.length;n+=1){r+=i[n].evaluate(t);}return r}],"*":[Ot,hr(Ot),function(t,e){for(var r=1,n=0,i=e;n<i.length;n+=1){r*=i[n].evaluate(t);}return r}],"-":{type:Ot,overloads:[[[Ot,Ot],function(t,e){var r=e[0],n=e[1];return r.evaluate(t)-n.evaluate(t)}],[[Ot],function(t,e){return -e[0].evaluate(t)}]]},"/":[Ot,[Ot,Ot],function(t,e){var r=e[0],n=e[1];return r.evaluate(t)/n.evaluate(t)}],"%":[Ot,[Ot,Ot],function(t,e){var r=e[0],n=e[1];return r.evaluate(t)%n.evaluate(t)}],ln2:[Ot,[],function(){return Math.LN2}],pi:[Ot,[],function(){return Math.PI}],e:[Ot,[],function(){return Math.E}],"^":[Ot,[Ot,Ot],function(t,e){var r=e[0],n=e[1];return Math.pow(r.evaluate(t),n.evaluate(t))}],sqrt:[Ot,[Ot],function(t,e){var r=e[0];return Math.sqrt(r.evaluate(t))}],log10:[Ot,[Ot],function(t,e){var r=e[0];return Math.log(r.evaluate(t))/Math.LN10}],ln:[Ot,[Ot],function(t,e){var r=e[0];return Math.log(r.evaluate(t))}],log2:[Ot,[Ot],function(t,e){var r=e[0];return Math.log(r.evaluate(t))/Math.LN2}],sin:[Ot,[Ot],function(t,e){var r=e[0];return Math.sin(r.evaluate(t))}],cos:[Ot,[Ot],function(t,e){var r=e[0];return Math.cos(r.evaluate(t))}],tan:[Ot,[Ot],function(t,e){var r=e[0];return Math.tan(r.evaluate(t))}],asin:[Ot,[Ot],function(t,e){var r=e[0];return Math.asin(r.evaluate(t))}],acos:[Ot,[Ot],function(t,e){var r=e[0];return Math.acos(r.evaluate(t))}],atan:[Ot,[Ot],function(t,e){var r=e[0];return Math.atan(r.evaluate(t))}],min:[Ot,hr(Ot),function(t,e){return Math.min.apply(Math,e.map((function(e){return e.evaluate(t)})))}],max:[Ot,hr(Ot),function(t,e){return Math.max.apply(Math,e.map((function(e){return e.evaluate(t)})))}],abs:[Ot,[Ot],function(t,e){var r=e[0];return Math.abs(r.evaluate(t))}],round:[Ot,[Ot],function(t,e){var r=e[0].evaluate(t);return r<0?-Math.round(-r):Math.round(r)}],floor:[Ot,[Ot],function(t,e){var r=e[0];return Math.floor(r.evaluate(t))}],ceil:[Ot,[Ot],function(t,e){var r=e[0];return Math.ceil(r.evaluate(t))}],"filter-==":[Dt,[Lt,jt],function(t,e){var r=e[0],n=e[1];return t.properties()[r.value]===n.value}],"filter-id-==":[Dt,[jt],function(t,e){var r=e[0];return t.id()===r.value}],"filter-type-==":[Dt,[Lt],function(t,e){var r=e[0];return t.geometryType()===r.value}],"filter-<":[Dt,[Lt,jt],function(t,e){var r=e[0],n=e[1],i=t.properties()[r.value],a=n.value;return typeof i==typeof a&&i<a}],"filter-id-<":[Dt,[jt],function(t,e){var r=e[0],n=t.id(),i=r.value;return typeof n==typeof i&&n<i}],"filter->":[Dt,[Lt,jt],function(t,e){var r=e[0],n=e[1],i=t.properties()[r.value],a=n.value;return typeof i==typeof a&&i>a}],"filter-id->":[Dt,[jt],function(t,e){var r=e[0],n=t.id(),i=r.value;return typeof n==typeof i&&n>i}],"filter-<=":[Dt,[Lt,jt],function(t,e){var r=e[0],n=e[1],i=t.properties()[r.value],a=n.value;return typeof i==typeof a&&i<=a}],"filter-id-<=":[Dt,[jt],function(t,e){var r=e[0],n=t.id(),i=r.value;return typeof n==typeof i&&n<=i}],"filter->=":[Dt,[Lt,jt],function(t,e){var r=e[0],n=e[1],i=t.properties()[r.value],a=n.value;return typeof i==typeof a&&i>=a}],"filter-id->=":[Dt,[jt],function(t,e){var r=e[0],n=t.id(),i=r.value;return typeof n==typeof i&&n>=i}],"filter-has":[Dt,[jt],function(t,e){return e[0].value in t.properties()}],"filter-has-id":[Dt,[],function(t){return null!==t.id()}],"filter-type-in":[Dt,[Zt(Lt)],function(t,e){return e[0].value.indexOf(t.geometryType())>=0}],"filter-id-in":[Dt,[Zt(jt)],function(t,e){return e[0].value.indexOf(t.id())>=0}],"filter-in-small":[Dt,[Lt,Zt(jt)],function(t,e){var r=e[0];return e[1].value.indexOf(t.properties()[r.value])>=0}],"filter-in-large":[Dt,[Lt,Zt(jt)],function(t,e){var r=e[0],n=e[1];return function(t,e,r,n){for(;r<=n;){var i=r+n>>1;if(e[i]===t)return !0;e[i]>t?n=i-1:r=i+1;}return !1}(t.properties()[r.value],n.value,0,n.value.length-1)}],all:{type:Dt,overloads:[[[Dt,Dt],function(t,e){var r=e[0],n=e[1];return r.evaluate(t)&&n.evaluate(t)}],[hr(Dt),function(t,e){for(var r=0,n=e;r<n.length;r+=1){if(!n[r].evaluate(t))return !1}return !0}]]},any:{type:Dt,overloads:[[[Dt,Dt],function(t,e){var r=e[0],n=e[1];return r.evaluate(t)||n.evaluate(t)}],[hr(Dt),function(t,e){for(var r=0,n=e;r<n.length;r+=1){if(n[r].evaluate(t))return !0}return !1}]]},"!":[Dt,[Dt],function(t,e){return !e[0].evaluate(t)}],"is-supported-script":[Dt,[Lt],function(t,e){var r=e[0],n=t.globals&&t.globals.isSupportedScript;return !n||n(r.evaluate(t))}],upcase:[Lt,[Lt],function(t,e){return e[0].evaluate(t).toUpperCase()}],downcase:[Lt,[Lt],function(t,e){return e[0].evaluate(t).toLowerCase()}],concat:[Lt,hr(jt),function(t,e){return e.map((function(e){return ne(e.evaluate(t))})).join("")}],"resolved-locale":[Lt,[qt],function(t,e){return e[0].evaluate(t).resolvedLocale()}]});var zr=function(t,e){this.expression=t,this._warningHistory={},this._evaluator=new fe,this._defaultValue=e?function(t){return "color"===t.type&&xr(t.default)?new Yt(0,0,0,0):"color"===t.type?Yt.parse(t.default)||null:void 0===t.default?null:t.default}(e):null,this._enumValues=e&&"enum"===e.type?e.values:null;};function Ir(t){return Array.isArray(t)&&t.length>0&&"string"==typeof t[0]&&t[0]in ur}function Cr(t,e){var r=new be(ur,[],e?function(t){var e={color:Ut,string:Lt,number:Ot,enum:Lt,boolean:Dt,formatted:Nt,image:Kt};if("array"===t.type)return Zt(e[t.value]||jt,t.length);return e[t.type]}(e):void 0),n=r.parse(t,void 0,void 0,void 0,e&&"string"===e.type?{typeAnnotation:"coerce"}:void 0);return n?fr(new zr(n,e)):yr(r.errors)}zr.prototype.evaluateWithoutErrorHandling=function(t,e,r,n,i){return this._evaluator.globals=t,this._evaluator.feature=e,this._evaluator.featureState=r,this._evaluator.availableImages=n||null,this._evaluator.formattedSection=i,this.expression.evaluate(this._evaluator)},zr.prototype.evaluate=function(t,e,r,n,i){this._evaluator.globals=t,this._evaluator.feature=e||null,this._evaluator.featureState=r||null,this._evaluator.availableImages=n||null,this._evaluator.formattedSection=i||null;try{var a=this.expression.evaluate(this._evaluator);if(null==a)return this._defaultValue;if(this._enumValues&&!(a in this._enumValues))throw new ae("Expected value to be one of "+Object.keys(this._enumValues).map((function(t){return JSON.stringify(t)})).join(", ")+", but found "+JSON.stringify(a)+" instead.");return a}catch(t){return this._warningHistory[t.message]||(this._warningHistory[t.message]=!0,"undefined"!=typeof console&&console.warn(t.message)),this._defaultValue}};var Br=function(t,e){this.kind=t,this._styleExpression=e,this.isStateDependent="constant"!==t&&!ve(e.expression);};Br.prototype.evaluateWithoutErrorHandling=function(t,e,r,n,i){return this._styleExpression.evaluateWithoutErrorHandling(t,e,r,n,i)},Br.prototype.evaluate=function(t,e,r,n,i){return this._styleExpression.evaluate(t,e,r,n,i)};var Er=function(t,e,r,n){this.kind=t,this.zoomStops=r,this._styleExpression=e,this.isStateDependent="camera"!==t&&!ve(e.expression),this.interpolationType=n;};function Mr(t,e){if("error"===(t=Cr(t,e)).result)return t;var r=t.value.expression,n=me(r);if(!n&&!dr(e))return yr([new Tt("","data expressions not supported")]);var i=ge(r,["zoom"]);if(!i&&!mr(e))return yr([new Tt("","zoom expressions not supported")]);var a=function t(e){var r=null;if(e instanceof Ge)r=t(e.result);else if(e instanceof Xe)for(var n=0,i=e.args;n<i.length;n+=1){var a=i[n];if(r=t(a))break}else(e instanceof we||e instanceof Ke)&&e.input instanceof ye&&"zoom"===e.input.name&&(r=e);if(r instanceof Tt)return r;e.eachChild((function(e){var n=t(e);n instanceof Tt?r=n:!r&&n?r=new Tt("",'"zoom" expression may only be used as input to a top-level "step" or "interpolate" expression.'):r&&n&&r!==n&&(r=new Tt("",'Only one zoom-based "step" or "interpolate" subexpression may be used in an expression.'));}));return r}(r);if(!a&&!i)return yr([new Tt("",'"zoom" expression may only be used as input to a top-level "step" or "interpolate" expression.')]);if(a instanceof Tt)return yr([a]);if(a instanceof Ke&&!vr(e))return yr([new Tt("",'"interpolate" expressions cannot be used with this property')]);if(!a)return fr(new Br(n?"constant":"source",t.value));var o=a instanceof Ke?a.interpolation:void 0;return fr(new Er(n?"camera":"composite",t.value,a.labels,o))}Er.prototype.evaluateWithoutErrorHandling=function(t,e,r,n,i){return this._styleExpression.evaluateWithoutErrorHandling(t,e,r,n,i)},Er.prototype.evaluate=function(t,e,r,n,i){return this._styleExpression.evaluate(t,e,r,n,i)},Er.prototype.interpolationFactor=function(t,e,r){return this.interpolationType?Ke.interpolationFactor(this.interpolationType,t,e,r):0};var Pr=function(t,e){this._parameters=t,this._specification=e,Bt(this,function t(e,r){var n,i,a,o="color"===r.type,s=e.stops&&"object"==typeof e.stops[0][0],u=s||void 0!==e.property,l=s||!u,p=e.type||(vr(r)?"exponential":"interval");if(o&&((e=Bt({},e)).stops&&(e.stops=e.stops.map((function(t){return [t[0],Yt.parse(t[1])]}))),e.default?e.default=Yt.parse(e.default):e.default=Yt.parse(r.default)),e.colorSpace&&"rgb"!==e.colorSpace&&!Ne[e.colorSpace])throw new Error("Unknown color space: "+e.colorSpace);if("exponential"===p)n=kr;else if("interval"===p)n=Ar;else if("categorical"===p){n=wr,i=Object.create(null);for(var c=0,h=e.stops;c<h.length;c+=1){var f=h[c];i[f[0]]=f[1];}a=typeof e.stops[0][0];}else{if("identity"!==p)throw new Error('Unknown function type "'+p+'"');n=Sr;}if(s){for(var y={},d=[],m=0;m<e.stops.length;m++){var v=e.stops[m],g=v[0].zoom;void 0===y[g]&&(y[g]={zoom:g,type:e.type,property:e.property,default:e.default,stops:[]},d.push(g)),y[g].stops.push([v[0].value,v[1]]);}for(var x=[],b=0,_=d;b<_.length;b+=1){var w=_[b];x.push([y[w].zoom,t(y[w],r)]);}var A={name:"linear"};return {kind:"composite",interpolationType:A,interpolationFactor:Ke.interpolationFactor.bind(void 0,A),zoomStops:x.map((function(t){return t[0]})),evaluate:function(t,n){var i=t.zoom;return kr({stops:x,base:e.base},r,i).evaluate(i,n)}}}if(l){var k="exponential"===p?{name:"exponential",base:void 0!==e.base?e.base:1}:null;return {kind:"camera",interpolationType:k,interpolationFactor:Ke.interpolationFactor.bind(void 0,k),zoomStops:e.stops.map((function(t){return t[0]})),evaluate:function(t){var o=t.zoom;return n(e,r,o,i,a)}}}return {kind:"source",evaluate:function(t,o){var s=o&&o.properties?o.properties[e.property]:void 0;return void 0===s?_r(e.default,r.default):n(e,r,s,i,a)}}}(this._parameters,this._specification));};function Tr(t){var e=t.key,r=t.value,n=t.valueSpec||{},i=t.objectElementValidators||{},a=t.style,o=t.styleSpec,s=[],u=gr(r);if("object"!==u)return [new It(e,r,"object expected, "+u+" found")];for(var l in r){var p=l.split(".")[0],c=n[p]||n["*"],h=void 0;if(i[p])h=i[p];else if(n[p])h=nn;else if(i["*"])h=i["*"];else{if(!n["*"]){s.push(new It(e,r[l],'unknown property "'+l+'"'));continue}h=nn;}s=s.concat(h({key:(e?e+".":e)+l,value:r[l],valueSpec:c,style:a,styleSpec:o,object:r,objectKey:l},r));}for(var f in n)i[f]||n[f].required&&void 0===n[f].default&&void 0===r[f]&&s.push(new It(e,r,'missing required property "'+f+'"'));return s}function Vr(t){var e=t.value,r=t.valueSpec,n=t.style,i=t.styleSpec,a=t.key,o=t.arrayElementValidator||nn;if("array"!==gr(e))return [new It(a,e,"array expected, "+gr(e)+" found")];if(r.length&&e.length!==r.length)return [new It(a,e,"array length "+r.length+" expected, length "+e.length+" found")];if(r["min-length"]&&e.length<r["min-length"])return [new It(a,e,"array length at least "+r["min-length"]+" expected, length "+e.length+" found")];var s={type:r.value,values:r.values};i.$version<7&&(s.function=r.function),"object"===gr(r.value)&&(s=r.value);for(var u=[],l=0;l<e.length;l++)u=u.concat(o({array:e,arrayIndex:l,value:e[l],valueSpec:s,style:n,styleSpec:i,key:a+"["+l+"]"}));return u}function Fr(t){var e=t.key,r=t.value,n=t.valueSpec,i=gr(r);return "number"!==i?[new It(e,r,"number expected, "+i+" found")]:"minimum"in n&&r<n.minimum?[new It(e,r,r+" is less than the minimum value "+n.minimum)]:"maximum"in n&&r>n.maximum?[new It(e,r,r+" is greater than the maximum value "+n.maximum)]:[]}function Or(t){var e,r,n,i=t.valueSpec,a=Mt(t.value.type),o={},s="categorical"!==a&&void 0===t.value.property,u=!s,l="array"===gr(t.value.stops)&&"array"===gr(t.value.stops[0])&&"object"===gr(t.value.stops[0][0]),p=Tr({key:t.key,value:t.value,valueSpec:t.styleSpec.function,style:t.style,styleSpec:t.styleSpec,objectElementValidators:{stops:function(t){if("identity"===a)return [new It(t.key,t.value,'identity function may not have a "stops" property')];var e=[],r=t.value;e=e.concat(Vr({key:t.key,value:r,valueSpec:t.valueSpec,style:t.style,styleSpec:t.styleSpec,arrayElementValidator:c})),"array"===gr(r)&&0===r.length&&e.push(new It(t.key,r,"array must have at least one stop"));return e},default:function(t){return nn({key:t.key,value:t.value,valueSpec:i,style:t.style,styleSpec:t.styleSpec})}}});return "identity"===a&&s&&p.push(new It(t.key,t.value,'missing required property "property"')),"identity"===a||t.value.stops||p.push(new It(t.key,t.value,'missing required property "stops"')),"exponential"===a&&t.valueSpec.expression&&!vr(t.valueSpec)&&p.push(new It(t.key,t.value,"exponential functions not supported")),t.styleSpec.$version>=8&&(u&&!dr(t.valueSpec)?p.push(new It(t.key,t.value,"property functions not supported")):s&&!mr(t.valueSpec)&&p.push(new It(t.key,t.value,"zoom functions not supported"))),"categorical"!==a&&!l||void 0!==t.value.property||p.push(new It(t.key,t.value,'"property" property is required')),p;function c(t){var e=[],a=t.value,s=t.key;if("array"!==gr(a))return [new It(s,a,"array expected, "+gr(a)+" found")];if(2!==a.length)return [new It(s,a,"array length 2 expected, length "+a.length+" found")];if(l){if("object"!==gr(a[0]))return [new It(s,a,"object expected, "+gr(a[0])+" found")];if(void 0===a[0].zoom)return [new It(s,a,"object stop key must have zoom")];if(void 0===a[0].value)return [new It(s,a,"object stop key must have value")];if(n&&n>Mt(a[0].zoom))return [new It(s,a[0].zoom,"stop zoom values must appear in ascending order")];Mt(a[0].zoom)!==n&&(n=Mt(a[0].zoom),r=void 0,o={}),e=e.concat(Tr({key:s+"[0]",value:a[0],valueSpec:{zoom:{}},style:t.style,styleSpec:t.styleSpec,objectElementValidators:{zoom:Fr,value:h}}));}else e=e.concat(h({key:s+"[0]",value:a[0],valueSpec:{},style:t.style,styleSpec:t.styleSpec},a));return Ir(Pt(a[1]))?e.concat([new It(s+"[1]",a[1],"expressions are not allowed in function stops.")]):e.concat(nn({key:s+"[1]",value:a[1],valueSpec:i,style:t.style,styleSpec:t.styleSpec}))}function h(t,n){var s=gr(t.value),u=Mt(t.value),l=null!==t.value?t.value:n;if(e){if(s!==e)return [new It(t.key,l,s+" stop domain type must match previous stop domain type "+e)]}else e=s;if("number"!==s&&"string"!==s&&"boolean"!==s)return [new It(t.key,l,"stop domain value must be a number, string, or boolean")];if("number"!==s&&"categorical"!==a){var p="number expected, "+s+" found";return dr(i)&&void 0===a&&(p+='\nIf you intended to use a categorical function, specify `"type": "categorical"`.'),[new It(t.key,l,p)]}return "categorical"!==a||"number"!==s||isFinite(u)&&Math.floor(u)===u?"categorical"!==a&&"number"===s&&void 0!==r&&u<r?[new It(t.key,l,"stop domain values must appear in ascending order")]:(r=u,"categorical"===a&&u in o?[new It(t.key,l,"stop domain values must be unique")]:(o[u]=!0,[])):[new It(t.key,l,"integer expected, found "+u)]}}function Lr(t){var e=("property"===t.expressionContext?Mr:Cr)(Pt(t.value),t.valueSpec);if("error"===e.result)return e.value.map((function(e){return new It(""+t.key+e.key,t.value,e.message)}));var r=e.value.expression||e.value._styleExpression.expression;if("property"===t.expressionContext&&"text-font"===t.propertyKey&&-1!==r.possibleOutputs().indexOf(void 0))return [new It(t.key,t.value,'Invalid data expression for "'+t.propertyKey+'". Output values must be contained as literals within the expression.')];if("property"===t.expressionContext&&"layout"===t.propertyType&&!ve(r))return [new It(t.key,t.value,'"feature-state" data expressions are not supported with layout properties.')];if("filter"===t.expressionContext&&!ve(r))return [new It(t.key,t.value,'"feature-state" data expressions are not supported with filters.')];if(t.expressionContext&&0===t.expressionContext.indexOf("cluster")){if(!ge(r,["zoom","feature-state"]))return [new It(t.key,t.value,'"zoom" and "feature-state" expressions are not supported with cluster properties.')];if("cluster-initial"===t.expressionContext&&!me(r))return [new It(t.key,t.value,"Feature data expressions are not supported with initial expression part of cluster properties.")]}return []}function Dr(t){var e=t.key,r=t.value,n=t.valueSpec,i=[];return Array.isArray(n.values)?-1===n.values.indexOf(Mt(r))&&i.push(new It(e,r,"expected one of ["+n.values.join(", ")+"], "+JSON.stringify(r)+" found")):-1===Object.keys(n.values).indexOf(Mt(r))&&i.push(new It(e,r,"expected one of ["+Object.keys(n.values).join(", ")+"], "+JSON.stringify(r)+" found")),i}function Ur(t){if(!0===t||!1===t)return !0;if(!Array.isArray(t)||0===t.length)return !1;switch(t[0]){case"has":return t.length>=2&&"$id"!==t[1]&&"$type"!==t[1];case"in":case"!in":case"!has":case"none":return !1;case"==":case"!=":case">":case">=":case"<":case"<=":return 3!==t.length||Array.isArray(t[1])||Array.isArray(t[2]);case"any":case"all":for(var e=0,r=t.slice(1);e<r.length;e+=1){var n=r[e];if(!Ur(n)&&"boolean"!=typeof n)return !1}return !0;default:return !0}}Pr.deserialize=function(t){return new Pr(t._parameters,t._specification)},Pr.serialize=function(t){return {_parameters:t._parameters,_specification:t._specification}};var Rr={type:"boolean",default:!1,transition:!1,"property-type":"data-driven",expression:{interpolated:!1,parameters:["zoom","feature"]}};function jr(t){if(null==t)return function(){return !0};Ur(t)||(t=Nr(t));var e=Cr(t,Rr);if("error"===e.result)throw new Error(e.value.map((function(t){return t.key+": "+t.message})).join(", "));return function(t,r){return e.value.evaluate(t,r)}}function qr(t,e){return t<e?-1:t>e?1:0}function Nr(t){if(!t)return !0;var e,r=t[0];return t.length<=1?"any"!==r:"=="===r?Kr(t[1],t[2],"=="):"!="===r?Gr(Kr(t[1],t[2],"==")):"<"===r||">"===r||"<="===r||">="===r?Kr(t[1],t[2],r):"any"===r?(e=t.slice(1),["any"].concat(e.map(Nr))):"all"===r?["all"].concat(t.slice(1).map(Nr)):"none"===r?["all"].concat(t.slice(1).map(Nr).map(Gr)):"in"===r?Zr(t[1],t.slice(2)):"!in"===r?Gr(Zr(t[1],t.slice(2))):"has"===r?Xr(t[1]):"!has"!==r||Gr(Xr(t[1]))}function Kr(t,e,r){switch(t){case"$type":return ["filter-type-"+r,e];case"$id":return ["filter-id-"+r,e];default:return ["filter-"+r,t,e]}}function Zr(t,e){if(0===e.length)return !1;switch(t){case"$type":return ["filter-type-in",["literal",e]];case"$id":return ["filter-id-in",["literal",e]];default:return e.length>200&&!e.some((function(t){return typeof t!=typeof e[0]}))?["filter-in-large",t,["literal",e.sort(qr)]]:["filter-in-small",t,["literal",e]]}}function Xr(t){switch(t){case"$type":return !0;case"$id":return ["filter-has-id"];default:return ["filter-has",t]}}function Gr(t){return ["!",t]}function Jr(t){return Ur(Pt(t.value))?Lr(Bt({},t,{expressionContext:"filter",valueSpec:{value:"boolean"}})):function t(e){var r=e.value;var n=e.key;if("array"!==gr(r))return [new It(n,r,"array expected, "+gr(r)+" found")];var i=e.styleSpec;var a;var o=[];if(r.length<1)return [new It(n,r,"filter array must have at least 1 element")];o=o.concat(Dr({key:n+"[0]",value:r[0],valueSpec:i.filter_operator,style:e.style,styleSpec:e.styleSpec}));switch(Mt(r[0])){case"<":case"<=":case">":case">=":r.length>=2&&"$type"===Mt(r[1])&&o.push(new It(n,r,'"$type" cannot be use with operator "'+r[0]+'"'));case"==":case"!=":3!==r.length&&o.push(new It(n,r,'filter array for operator "'+r[0]+'" must have 3 elements'));case"in":case"!in":r.length>=2&&"string"!==(a=gr(r[1]))&&o.push(new It(n+"[1]",r[1],"string expected, "+a+" found"));for(var s=2;s<r.length;s++)a=gr(r[s]),"$type"===Mt(r[1])?o=o.concat(Dr({key:n+"["+s+"]",value:r[s],valueSpec:i.geometry_type,style:e.style,styleSpec:e.styleSpec})):"string"!==a&&"number"!==a&&"boolean"!==a&&o.push(new It(n+"["+s+"]",r[s],"string, number, or boolean expected, "+a+" found"));break;case"any":case"all":case"none":for(var u=1;u<r.length;u++)o=o.concat(t({key:n+"["+u+"]",value:r[u],style:e.style,styleSpec:e.styleSpec}));break;case"has":case"!has":a=gr(r[1]),2!==r.length?o.push(new It(n,r,'filter array for "'+r[0]+'" operator must have 2 elements')):"string"!==a&&o.push(new It(n+"[1]",r[1],"string expected, "+a+" found"));}return o}(t)}function Hr(t,e){var r=t.key,n=t.style,i=t.styleSpec,a=t.value,o=t.objectKey,s=i[e+"_"+t.layerType];if(!s)return [];var u=o.match(/^(.*)-transition$/);if("paint"===e&&u&&s[u[1]]&&s[u[1]].transition)return nn({key:r,value:a,valueSpec:i.transition,style:n,styleSpec:i});var l,p=t.valueSpec||s[o];if(!p)return [new It(r,a,'unknown property "'+o+'"')];if("string"===gr(a)&&dr(p)&&!p.tokens&&(l=/^{([^}]+)}$/.exec(a)))return [new It(r,a,'"'+o+'" does not support interpolation syntax\nUse an identity property function instead: `{ "type": "identity", "property": '+JSON.stringify(l[1])+" }`.")];var c=[];return "symbol"===t.layerType&&("text-field"===o&&n&&!n.glyphs&&c.push(new It(r,a,'use of "text-field" requires a style "glyphs" property')),"text-font"===o&&xr(Pt(a))&&"identity"===Mt(a.type)&&c.push(new It(r,a,'"text-font" does not support identity functions'))),c.concat(nn({key:t.key,value:a,valueSpec:p,style:n,styleSpec:i,expressionContext:"property",propertyType:e,propertyKey:o}))}function Yr(t){return Hr(t,"paint")}function $r(t){return Hr(t,"layout")}function Wr(t){var e=[],r=t.value,n=t.key,i=t.style,a=t.styleSpec;r.type||r.ref||e.push(new It(n,r,'either "type" or "ref" is required'));var o,s=Mt(r.type),u=Mt(r.ref);if(r.id)for(var l=Mt(r.id),p=0;p<t.arrayIndex;p++){var c=i.layers[p];Mt(c.id)===l&&e.push(new It(n,r.id,'duplicate layer id "'+r.id+'", previously used at line '+c.id.__line__));}if("ref"in r)["type","source","source-layer","filter","layout"].forEach((function(t){t in r&&e.push(new It(n,r[t],'"'+t+'" is prohibited for ref layers'));})),i.layers.forEach((function(t){Mt(t.id)===u&&(o=t);})),o?o.ref?e.push(new It(n,r.ref,"ref cannot reference another ref layer")):s=Mt(o.type):e.push(new It(n,r.ref,'ref layer "'+u+'" not found'));else if("background"!==s)if(r.source){var h=i.sources&&i.sources[r.source],f=h&&Mt(h.type);h?"vector"===f&&"raster"===s?e.push(new It(n,r.source,'layer "'+r.id+'" requires a raster source')):"raster"===f&&"raster"!==s?e.push(new It(n,r.source,'layer "'+r.id+'" requires a vector source')):"vector"!==f||r["source-layer"]?"raster-dem"===f&&"hillshade"!==s?e.push(new It(n,r.source,"raster-dem source can only be used with layer type 'hillshade'.")):"line"!==s||!r.paint||!r.paint["line-gradient"]||"geojson"===f&&h.lineMetrics||e.push(new It(n,r,'layer "'+r.id+'" specifies a line-gradient, which requires a GeoJSON source with `lineMetrics` enabled.')):e.push(new It(n,r,'layer "'+r.id+'" must specify a "source-layer"')):e.push(new It(n,r.source,'source "'+r.source+'" not found'));}else e.push(new It(n,r,'missing required property "source"'));return e=e.concat(Tr({key:n,value:r,valueSpec:a.layer,style:t.style,styleSpec:t.styleSpec,objectElementValidators:{"*":function(){return []},type:function(){return nn({key:n+".type",value:r.type,valueSpec:a.layer.type,style:t.style,styleSpec:t.styleSpec,object:r,objectKey:"type"})},filter:Jr,layout:function(t){return Tr({layer:r,key:t.key,value:t.value,style:t.style,styleSpec:t.styleSpec,objectElementValidators:{"*":function(t){return $r(Bt({layerType:s},t))}}})},paint:function(t){return Tr({layer:r,key:t.key,value:t.value,style:t.style,styleSpec:t.styleSpec,objectElementValidators:{"*":function(t){return Yr(Bt({layerType:s},t))}}})}}}))}function Qr(t){var e=t.value,r=t.key,n=t.styleSpec,i=t.style;if(!e.type)return [new It(r,e,'"type" is required')];var a,o=Mt(e.type);switch(o){case"vector":case"raster":case"raster-dem":return a=Tr({key:r,value:e,valueSpec:n["source_"+o.replace("-","_")],style:t.style,styleSpec:n});case"geojson":if(a=Tr({key:r,value:e,valueSpec:n.source_geojson,style:i,styleSpec:n}),e.cluster)for(var s in e.clusterProperties){var u=e.clusterProperties[s],l=u[0],p=u[1],c="string"==typeof l?[l,["accumulated"],["get",s]]:l;a.push.apply(a,Lr({key:r+"."+s+".map",value:p,expressionContext:"cluster-map"})),a.push.apply(a,Lr({key:r+"."+s+".reduce",value:c,expressionContext:"cluster-reduce"}));}return a;case"video":return Tr({key:r,value:e,valueSpec:n.source_video,style:i,styleSpec:n});case"image":return Tr({key:r,value:e,valueSpec:n.source_image,style:i,styleSpec:n});case"canvas":return [new It(r,null,"Please use runtime APIs to add canvas sources, rather than including them in stylesheets.","source.canvas")];default:return Dr({key:r+".type",value:e.type,valueSpec:{values:["vector","raster","raster-dem","geojson","video","image"]},style:i,styleSpec:n})}}function tn(t){var e=t.value,r=t.styleSpec,n=r.light,i=t.style,a=[],o=gr(e);if(void 0===e)return a;if("object"!==o)return a=a.concat([new It("light",e,"object expected, "+o+" found")]);for(var s in e){var u=s.match(/^(.*)-transition$/);a=u&&n[u[1]]&&n[u[1]].transition?a.concat(nn({key:s,value:e[s],valueSpec:r.transition,style:i,styleSpec:r})):n[s]?a.concat(nn({key:s,value:e[s],valueSpec:n[s],style:i,styleSpec:r})):a.concat([new It(s,e[s],'unknown property "'+s+'"')]);}return a}function en(t){var e=t.value,r=t.key,n=gr(e);return "string"!==n?[new It(r,e,"string expected, "+n+" found")]:[]}var rn={"*":function(){return []},array:Vr,boolean:function(t){var e=t.value,r=t.key,n=gr(e);return "boolean"!==n?[new It(r,e,"boolean expected, "+n+" found")]:[]},number:Fr,color:function(t){var e=t.key,r=t.value,n=gr(r);return "string"!==n?[new It(e,r,"color expected, "+n+" found")]:null===Ht(r)?[new It(e,r,'color expected, "'+r+'" found')]:[]},constants:Ct,enum:Dr,filter:Jr,function:Or,layer:Wr,object:Tr,source:Qr,light:tn,string:en,formatted:function(t){return 0===en(t).length?[]:Lr(t)},image:function(t){return 0===en(t).length?[]:Lr(t)}};function nn(t){var e=t.value,r=t.valueSpec,n=t.styleSpec;return r.expression&&xr(Mt(e))?Or(t):r.expression&&Ir(Pt(e))?Lr(t):r.type&&rn[r.type]?rn[r.type](t):Tr(Bt({},t,{valueSpec:r.type?n[r.type]:r}))}function an(t){var e=t.value,r=t.key,n=en(t);return n.length?n:(-1===e.indexOf("{fontstack}")&&n.push(new It(r,e,'"glyphs" url must include a "{fontstack}" token')),-1===e.indexOf("{range}")&&n.push(new It(r,e,'"glyphs" url must include a "{range}" token')),n)}function on(t,e){void 0===e&&(e=zt);var r=[];return r=r.concat(nn({key:"",value:t,valueSpec:e.$root,styleSpec:e,style:t,objectElementValidators:{glyphs:an,"*":function(){return []}}})),t.constants&&(r=r.concat(Ct({key:"constants",value:t.constants,style:t,styleSpec:e}))),sn(r)}function sn(t){return [].concat(t).sort((function(t,e){return t.line-e.line}))}function un(t){return function(){for(var e=[],r=arguments.length;r--;)e[r]=arguments[r];return sn(t.apply(this,e))}}on.source=un(Qr),on.light=un(tn),on.layer=un(Wr),on.filter=un(Jr),on.paintProperty=un(Yr),on.layoutProperty=un($r);var ln=on,pn=ln.light,cn=ln.paintProperty,hn=ln.layoutProperty;function fn(t,e){var r=!1;if(e&&e.length)for(var n=0,i=e;n<i.length;n+=1){var a=i[n];t.fire(new kt(new Error(a.message))),r=!0;}return r}var yn=mn,dn=3;function mn(t,e,r){var n=this.cells=[];if(t instanceof ArrayBuffer){this.arrayBuffer=t;var i=new Int32Array(this.arrayBuffer);t=i[0],e=i[1],r=i[2],this.d=e+2*r;for(var a=0;a<this.d*this.d;a++){var o=i[dn+a],s=i[dn+a+1];n.push(o===s?null:i.subarray(o,s));}var u=i[dn+n.length],l=i[dn+n.length+1];this.keys=i.subarray(u,l),this.bboxes=i.subarray(l),this.insert=this._insertReadonly;}else{this.d=e+2*r;for(var p=0;p<this.d*this.d;p++)n.push([]);this.keys=[],this.bboxes=[];}this.n=e,this.extent=t,this.padding=r,this.scale=e/t,this.uid=0;var c=r/e*t;this.min=-c,this.max=t+c;}mn.prototype.insert=function(t,e,r,n,i){this._forEachCell(e,r,n,i,this._insertCell,this.uid++),this.keys.push(t),this.bboxes.push(e),this.bboxes.push(r),this.bboxes.push(n),this.bboxes.push(i);},mn.prototype._insertReadonly=function(){throw"Cannot insert into a GridIndex created from an ArrayBuffer."},mn.prototype._insertCell=function(t,e,r,n,i,a){this.cells[i].push(a);},mn.prototype.query=function(t,e,r,n,i){var a=this.min,o=this.max;if(t<=a&&e<=a&&o<=r&&o<=n&&!i)return Array.prototype.slice.call(this.keys);var s=[];return this._forEachCell(t,e,r,n,this._queryCell,s,{},i),s},mn.prototype._queryCell=function(t,e,r,n,i,a,o,s){var u=this.cells[i];if(null!==u)for(var l=this.keys,p=this.bboxes,c=0;c<u.length;c++){var h=u[c];if(void 0===o[h]){var f=4*h;(s?s(p[f+0],p[f+1],p[f+2],p[f+3]):t<=p[f+2]&&e<=p[f+3]&&r>=p[f+0]&&n>=p[f+1])?(o[h]=!0,a.push(l[h])):o[h]=!1;}}},mn.prototype._forEachCell=function(t,e,r,n,i,a,o,s){for(var u=this._convertToCellCoord(t),l=this._convertToCellCoord(e),p=this._convertToCellCoord(r),c=this._convertToCellCoord(n),h=u;h<=p;h++)for(var f=l;f<=c;f++){var y=this.d*f+h;if((!s||s(this._convertFromCellCoord(h),this._convertFromCellCoord(f),this._convertFromCellCoord(h+1),this._convertFromCellCoord(f+1)))&&i.call(this,t,e,r,n,y,a,o,s))return}},mn.prototype._convertFromCellCoord=function(t){return (t-this.padding)/this.scale},mn.prototype._convertToCellCoord=function(t){return Math.max(0,Math.min(this.d-1,Math.floor(t*this.scale)+this.padding))},mn.prototype.toArrayBuffer=function(){if(this.arrayBuffer)return this.arrayBuffer;for(var t=this.cells,e=dn+this.cells.length+1+1,r=0,n=0;n<this.cells.length;n++)r+=this.cells[n].length;var i=new Int32Array(e+r+this.keys.length+this.bboxes.length);i[0]=this.extent,i[1]=this.n,i[2]=this.padding;for(var a=e,o=0;o<t.length;o++){var s=t[o];i[dn+o]=a,i.set(s,a),a+=s.length;}return i[dn+t.length]=a,i.set(this.keys,a),a+=this.keys.length,i[dn+t.length+1]=a,i.set(this.bboxes,a),a+=this.bboxes.length,i.buffer};var vn=self.ImageData,gn={};function xn(t,e,r){void 0===r&&(r={}),Object.defineProperty(e,"_classRegistryKey",{value:t,writeable:!1}),gn[t]={klass:e,omit:r.omit||[],shallow:r.shallow||[]};}for(var bn in xn("Object",Object),yn.serialize=function(t,e){var r=t.toArrayBuffer();return e&&e.push(r),{buffer:r}},yn.deserialize=function(t){return new yn(t.buffer)},xn("Grid",yn),xn("Color",Yt),xn("Error",Error),xn("StylePropertyFunction",Pr),xn("StyleExpression",zr,{omit:["_evaluator"]}),xn("ZoomDependentExpression",Er),xn("ZoomConstantExpression",Br),xn("CompoundExpression",ye,{omit:["_evaluate"]}),ur)ur[bn]._classRegistryKey||xn("Expression_"+bn,ur[bn]);function _n(t,e){if(null==t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||t instanceof Boolean||t instanceof Number||t instanceof String||t instanceof Date||t instanceof RegExp)return t;if(t instanceof ArrayBuffer)return e&&e.push(t),t;if(ArrayBuffer.isView(t)){var r=t;return e&&e.push(r.buffer),r}if(t instanceof vn)return e&&e.push(t.data.buffer),t;if(Array.isArray(t)){for(var n=[],i=0,a=t;i<a.length;i+=1){var o=a[i];n.push(_n(o,e));}return n}if("object"==typeof t){var s=t.constructor,u=s._classRegistryKey;if(!u)throw new Error("can't serialize object of unregistered class");var l=s.serialize?s.serialize(t,e):{};if(!s.serialize){for(var p in t)if(t.hasOwnProperty(p)&&!(gn[u].omit.indexOf(p)>=0)){var c=t[p];l[p]=gn[u].shallow.indexOf(p)>=0?c:_n(c,e);}t instanceof Error&&(l.message=t.message);}if(l.$name)throw new Error("$name property is reserved for worker serialization logic.");return "Object"!==u&&(l.$name=u),l}throw new Error("can't serialize object of type "+typeof t)}function wn(t){if(null==t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||t instanceof Boolean||t instanceof Number||t instanceof String||t instanceof Date||t instanceof RegExp||t instanceof ArrayBuffer||ArrayBuffer.isView(t)||t instanceof vn)return t;if(Array.isArray(t))return t.map(wn);if("object"==typeof t){var e=t.$name||"Object",r=gn[e].klass;if(!r)throw new Error("can't deserialize unregistered class "+e);if(r.deserialize)return r.deserialize(t);for(var n=Object.create(r.prototype),i=0,a=Object.keys(t);i<a.length;i+=1){var o=a[i];if("$name"!==o){var s=t[o];n[o]=gn[e].shallow.indexOf(o)>=0?s:wn(s);}}return n}throw new Error("can't deserialize object of type "+typeof t)}var An=function(){this.first=!0;};An.prototype.update=function(t,e){var r=Math.floor(t);return this.first?(this.first=!1,this.lastIntegerZoom=r,this.lastIntegerZoomTime=0,this.lastZoom=t,this.lastFloorZoom=r,!0):(this.lastFloorZoom>r?(this.lastIntegerZoom=r+1,this.lastIntegerZoomTime=e):this.lastFloorZoom<r&&(this.lastIntegerZoom=r,this.lastIntegerZoomTime=e),t!==this.lastZoom&&(this.lastZoom=t,this.lastFloorZoom=r,!0))};var kn={"Latin-1 Supplement":function(t){return t>=128&&t<=255},Arabic:function(t){return t>=1536&&t<=1791},"Arabic Supplement":function(t){return t>=1872&&t<=1919},"Arabic Extended-A":function(t){return t>=2208&&t<=2303},"Hangul Jamo":function(t){return t>=4352&&t<=4607},"Unified Canadian Aboriginal Syllabics":function(t){return t>=5120&&t<=5759},Khmer:function(t){return t>=6016&&t<=6143},"Unified Canadian Aboriginal Syllabics Extended":function(t){return t>=6320&&t<=6399},"General Punctuation":function(t){return t>=8192&&t<=8303},"Letterlike Symbols":function(t){return t>=8448&&t<=8527},"Number Forms":function(t){return t>=8528&&t<=8591},"Miscellaneous Technical":function(t){return t>=8960&&t<=9215},"Control Pictures":function(t){return t>=9216&&t<=9279},"Optical Character Recognition":function(t){return t>=9280&&t<=9311},"Enclosed Alphanumerics":function(t){return t>=9312&&t<=9471},"Geometric Shapes":function(t){return t>=9632&&t<=9727},"Miscellaneous Symbols":function(t){return t>=9728&&t<=9983},"Miscellaneous Symbols and Arrows":function(t){return t>=11008&&t<=11263},"CJK Radicals Supplement":function(t){return t>=11904&&t<=12031},"Kangxi Radicals":function(t){return t>=12032&&t<=12255},"Ideographic Description Characters":function(t){return t>=12272&&t<=12287},"CJK Symbols and Punctuation":function(t){return t>=12288&&t<=12351},Hiragana:function(t){return t>=12352&&t<=12447},Katakana:function(t){return t>=12448&&t<=12543},Bopomofo:function(t){return t>=12544&&t<=12591},"Hangul Compatibility Jamo":function(t){return t>=12592&&t<=12687},Kanbun:function(t){return t>=12688&&t<=12703},"Bopomofo Extended":function(t){return t>=12704&&t<=12735},"CJK Strokes":function(t){return t>=12736&&t<=12783},"Katakana Phonetic Extensions":function(t){return t>=12784&&t<=12799},"Enclosed CJK Letters and Months":function(t){return t>=12800&&t<=13055},"CJK Compatibility":function(t){return t>=13056&&t<=13311},"CJK Unified Ideographs Extension A":function(t){return t>=13312&&t<=19903},"Yijing Hexagram Symbols":function(t){return t>=19904&&t<=19967},"CJK Unified Ideographs":function(t){return t>=19968&&t<=40959},"Yi Syllables":function(t){return t>=40960&&t<=42127},"Yi Radicals":function(t){return t>=42128&&t<=42191},"Hangul Jamo Extended-A":function(t){return t>=43360&&t<=43391},"Hangul Syllables":function(t){return t>=44032&&t<=55215},"Hangul Jamo Extended-B":function(t){return t>=55216&&t<=55295},"Private Use Area":function(t){return t>=57344&&t<=63743},"CJK Compatibility Ideographs":function(t){return t>=63744&&t<=64255},"Arabic Presentation Forms-A":function(t){return t>=64336&&t<=65023},"Vertical Forms":function(t){return t>=65040&&t<=65055},"CJK Compatibility Forms":function(t){return t>=65072&&t<=65103},"Small Form Variants":function(t){return t>=65104&&t<=65135},"Arabic Presentation Forms-B":function(t){return t>=65136&&t<=65279},"Halfwidth and Fullwidth Forms":function(t){return t>=65280&&t<=65519}};function Sn(t){for(var e=0,r=t;e<r.length;e+=1){if(In(r[e].charCodeAt(0)))return !0}return !1}function zn(t){return !kn.Arabic(t)&&(!kn["Arabic Supplement"](t)&&(!kn["Arabic Extended-A"](t)&&(!kn["Arabic Presentation Forms-A"](t)&&!kn["Arabic Presentation Forms-B"](t))))}function In(t){return 746===t||747===t||!(t<4352)&&(!!kn["Bopomofo Extended"](t)||(!!kn.Bopomofo(t)||(!(!kn["CJK Compatibility Forms"](t)||t>=65097&&t<=65103)||(!!kn["CJK Compatibility Ideographs"](t)||(!!kn["CJK Compatibility"](t)||(!!kn["CJK Radicals Supplement"](t)||(!!kn["CJK Strokes"](t)||(!(!kn["CJK Symbols and Punctuation"](t)||t>=12296&&t<=12305||t>=12308&&t<=12319||12336===t)||(!!kn["CJK Unified Ideographs Extension A"](t)||(!!kn["CJK Unified Ideographs"](t)||(!!kn["Enclosed CJK Letters and Months"](t)||(!!kn["Hangul Compatibility Jamo"](t)||(!!kn["Hangul Jamo Extended-A"](t)||(!!kn["Hangul Jamo Extended-B"](t)||(!!kn["Hangul Jamo"](t)||(!!kn["Hangul Syllables"](t)||(!!kn.Hiragana(t)||(!!kn["Ideographic Description Characters"](t)||(!!kn.Kanbun(t)||(!!kn["Kangxi Radicals"](t)||(!!kn["Katakana Phonetic Extensions"](t)||(!(!kn.Katakana(t)||12540===t)||(!(!kn["Halfwidth and Fullwidth Forms"](t)||65288===t||65289===t||65293===t||t>=65306&&t<=65310||65339===t||65341===t||65343===t||t>=65371&&t<=65503||65507===t||t>=65512&&t<=65519)||(!(!kn["Small Form Variants"](t)||t>=65112&&t<=65118||t>=65123&&t<=65126)||(!!kn["Unified Canadian Aboriginal Syllabics"](t)||(!!kn["Unified Canadian Aboriginal Syllabics Extended"](t)||(!!kn["Vertical Forms"](t)||(!!kn["Yijing Hexagram Symbols"](t)||(!!kn["Yi Syllables"](t)||!!kn["Yi Radicals"](t))))))))))))))))))))))))))))))}function Cn(t){return !(In(t)||function(t){return !(!kn["Latin-1 Supplement"](t)||167!==t&&169!==t&&174!==t&&177!==t&&188!==t&&189!==t&&190!==t&&215!==t&&247!==t)||(!(!kn["General Punctuation"](t)||8214!==t&&8224!==t&&8225!==t&&8240!==t&&8241!==t&&8251!==t&&8252!==t&&8258!==t&&8263!==t&&8264!==t&&8265!==t&&8273!==t)||(!!kn["Letterlike Symbols"](t)||(!!kn["Number Forms"](t)||(!(!kn["Miscellaneous Technical"](t)||!(t>=8960&&t<=8967||t>=8972&&t<=8991||t>=8996&&t<=9e3||9003===t||t>=9085&&t<=9114||t>=9150&&t<=9165||9167===t||t>=9169&&t<=9179||t>=9186&&t<=9215))||(!(!kn["Control Pictures"](t)||9251===t)||(!!kn["Optical Character Recognition"](t)||(!!kn["Enclosed Alphanumerics"](t)||(!!kn["Geometric Shapes"](t)||(!(!kn["Miscellaneous Symbols"](t)||t>=9754&&t<=9759)||(!(!kn["Miscellaneous Symbols and Arrows"](t)||!(t>=11026&&t<=11055||t>=11088&&t<=11097||t>=11192&&t<=11243))||(!!kn["CJK Symbols and Punctuation"](t)||(!!kn.Katakana(t)||(!!kn["Private Use Area"](t)||(!!kn["CJK Compatibility Forms"](t)||(!!kn["Small Form Variants"](t)||(!!kn["Halfwidth and Fullwidth Forms"](t)||(8734===t||8756===t||8757===t||t>=9984&&t<=10087||t>=10102&&t<=10131||65532===t||65533===t)))))))))))))))))}(t))}function Bn(t,e){return !(!e&&(t>=1424&&t<=2303||kn["Arabic Presentation Forms-A"](t)||kn["Arabic Presentation Forms-B"](t)))&&!(t>=2304&&t<=3583||t>=3840&&t<=4255||kn.Khmer(t))}var En,Mn=!1,Pn=null,Tn=!1,Vn=new St,Fn={applyArabicShaping:null,processBidirectionalText:null,processStyledBidirectionalText:null,isLoaded:function(){return Tn||null!=Fn.applyArabicShaping}},On=function(t,e){this.zoom=t,e?(this.now=e.now,this.fadeDuration=e.fadeDuration,this.zoomHistory=e.zoomHistory,this.transition=e.transition):(this.now=0,this.fadeDuration=0,this.zoomHistory=new An,this.transition={});};On.prototype.isSupportedScript=function(t){return function(t,e){for(var r=0,n=t;r<n.length;r+=1){if(!Bn(n[r].charCodeAt(0),e))return !1}return !0}(t,Fn.isLoaded())},On.prototype.crossFadingFactor=function(){return 0===this.fadeDuration?1:Math.min((this.now-this.zoomHistory.lastIntegerZoomTime)/this.fadeDuration,1)},On.prototype.getCrossfadeParameters=function(){var t=this.zoom,e=t-Math.floor(t),r=this.crossFadingFactor();return t>this.zoomHistory.lastIntegerZoom?{fromScale:2,toScale:1,t:e+(1-e)*r}:{fromScale:.5,toScale:1,t:1-(1-r)*e}};var Ln=function(t,e){this.property=t,this.value=e,this.expression=function(t,e){if(xr(t))return new Pr(t,e);if(Ir(t)){var r=Mr(t,e);if("error"===r.result)throw new Error(r.value.map((function(t){return t.key+": "+t.message})).join(", "));return r.value}var n=t;return "string"==typeof t&&"color"===e.type&&(n=Yt.parse(t)),{kind:"constant",evaluate:function(){return n}}}(void 0===e?t.specification.default:e,t.specification);};Ln.prototype.isDataDriven=function(){return "source"===this.expression.kind||"composite"===this.expression.kind},Ln.prototype.possiblyEvaluate=function(t,e){return this.property.possiblyEvaluate(this,t,e)};var Dn=function(t){this.property=t,this.value=new Ln(t,void 0);};Dn.prototype.transitioned=function(t,e){return new Rn(this.property,this.value,e,c({},t.transition,this.transition),t.now)},Dn.prototype.untransitioned=function(){return new Rn(this.property,this.value,null,{},0)};var Un=function(t){this._properties=t,this._values=Object.create(t.defaultTransitionablePropertyValues);};Un.prototype.getValue=function(t){return b(this._values[t].value.value)},Un.prototype.setValue=function(t,e){this._values.hasOwnProperty(t)||(this._values[t]=new Dn(this._values[t].property)),this._values[t].value=new Ln(this._values[t].property,null===e?void 0:b(e));},Un.prototype.getTransition=function(t){return b(this._values[t].transition)},Un.prototype.setTransition=function(t,e){this._values.hasOwnProperty(t)||(this._values[t]=new Dn(this._values[t].property)),this._values[t].transition=b(e)||void 0;},Un.prototype.serialize=function(){for(var t={},e=0,r=Object.keys(this._values);e<r.length;e+=1){var n=r[e],i=this.getValue(n);void 0!==i&&(t[n]=i);var a=this.getTransition(n);void 0!==a&&(t[n+"-transition"]=a);}return t},Un.prototype.transitioned=function(t,e){for(var r=new jn(this._properties),n=0,i=Object.keys(this._values);n<i.length;n+=1){var a=i[n];r._values[a]=this._values[a].transitioned(t,e._values[a]);}return r},Un.prototype.untransitioned=function(){for(var t=new jn(this._properties),e=0,r=Object.keys(this._values);e<r.length;e+=1){var n=r[e];t._values[n]=this._values[n].untransitioned();}return t};var Rn=function(t,e,r,n,i){this.property=t,this.value=e,this.begin=i+n.delay||0,this.end=this.begin+n.duration||0,t.specification.transition&&(n.delay||n.duration)&&(this.prior=r);};Rn.prototype.possiblyEvaluate=function(t,e){var r=t.now||0,n=this.value.possiblyEvaluate(t,e),i=this.prior;if(i){if(r>this.end)return this.prior=null,n;if(this.value.isDataDriven())return this.prior=null,n;if(r<this.begin)return i.possiblyEvaluate(t,e);var a=(r-this.begin)/(this.end-this.begin);return this.property.interpolate(i.possiblyEvaluate(t,e),n,function(t){if(t<=0)return 0;if(t>=1)return 1;var e=t*t,r=e*t;return 4*(t<.5?r:3*(t-e)+r-.75)}(a))}return n};var jn=function(t){this._properties=t,this._values=Object.create(t.defaultTransitioningPropertyValues);};jn.prototype.possiblyEvaluate=function(t,e){for(var r=new Kn(this._properties),n=0,i=Object.keys(this._values);n<i.length;n+=1){var a=i[n];r._values[a]=this._values[a].possiblyEvaluate(t,e);}return r},jn.prototype.hasTransition=function(){for(var t=0,e=Object.keys(this._values);t<e.length;t+=1){var r=e[t];if(this._values[r].prior)return !0}return !1};var qn=function(t){this._properties=t,this._values=Object.create(t.defaultPropertyValues);};qn.prototype.getValue=function(t){return b(this._values[t].value)},qn.prototype.setValue=function(t,e){this._values[t]=new Ln(this._values[t].property,null===e?void 0:b(e));},qn.prototype.serialize=function(){for(var t={},e=0,r=Object.keys(this._values);e<r.length;e+=1){var n=r[e],i=this.getValue(n);void 0!==i&&(t[n]=i);}return t},qn.prototype.possiblyEvaluate=function(t,e){for(var r=new Kn(this._properties),n=0,i=Object.keys(this._values);n<i.length;n+=1){var a=i[n];r._values[a]=this._values[a].possiblyEvaluate(t,e);}return r};var Nn=function(t,e,r){this.property=t,this.value=e,this.parameters=r;};Nn.prototype.isConstant=function(){return "constant"===this.value.kind},Nn.prototype.constantOr=function(t){return "constant"===this.value.kind?this.value.value:t},Nn.prototype.evaluate=function(t,e,r){return this.property.evaluate(this.value,this.parameters,t,e,r)};var Kn=function(t){this._properties=t,this._values=Object.create(t.defaultPossiblyEvaluatedValues);};Kn.prototype.get=function(t){return this._values[t]};var Zn=function(t){this.specification=t;};Zn.prototype.possiblyEvaluate=function(t,e){return t.expression.evaluate(e)},Zn.prototype.interpolate=function(t,e,r){var n=ke[this.specification.type];return n?n(t,e,r):t};var Xn=function(t,e){this.specification=t,this.overrides=e;};Xn.prototype.possiblyEvaluate=function(t,e,r){return "constant"===t.expression.kind||"camera"===t.expression.kind?new Nn(this,{kind:"constant",value:t.expression.evaluate(e,null,{},r)},e):new Nn(this,t.expression,e)},Xn.prototype.interpolate=function(t,e,r){if("constant"!==t.value.kind||"constant"!==e.value.kind)return t;if(void 0===t.value.value||void 0===e.value.value)return new Nn(this,{kind:"constant",value:void 0},t.parameters);var n=ke[this.specification.type];return n?new Nn(this,{kind:"constant",value:n(t.value.value,e.value.value,r)},t.parameters):t},Xn.prototype.evaluate=function(t,e,r,n,i){return "constant"===t.kind?t.value:t.evaluate(e,r,n,i)};var Gn=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.possiblyEvaluate=function(t,e,r){if(void 0===t.value)return new Nn(this,{kind:"constant",value:void 0},e);if("constant"===t.expression.kind){var n=t.expression.evaluate(e,null,{},r),i="image"===t.property.specification.type&&"string"!=typeof n?n.name:n,a=this._calculate(i,i,i,e);return new Nn(this,{kind:"constant",value:a},e)}if("camera"===t.expression.kind){var o=this._calculate(t.expression.evaluate({zoom:e.zoom-1}),t.expression.evaluate({zoom:e.zoom}),t.expression.evaluate({zoom:e.zoom+1}),e);return new Nn(this,{kind:"constant",value:o},e)}return new Nn(this,t.expression,e)},e.prototype.evaluate=function(t,e,r,n,i){if("source"===t.kind){var a=t.evaluate(e,r,n,i);return this._calculate(a,a,a,e)}return "composite"===t.kind?this._calculate(t.evaluate({zoom:Math.floor(e.zoom)-1},r,n),t.evaluate({zoom:Math.floor(e.zoom)},r,n),t.evaluate({zoom:Math.floor(e.zoom)+1},r,n),e):t.value},e.prototype._calculate=function(t,e,r,n){return n.zoom>n.zoomHistory.lastIntegerZoom?{from:t,to:e}:{from:r,to:e}},e.prototype.interpolate=function(t){return t},e}(Xn),Jn=function(t){this.specification=t;};Jn.prototype.possiblyEvaluate=function(t,e,r){if(void 0!==t.value){if("constant"===t.expression.kind){var n=t.expression.evaluate(e,null,{},r);return this._calculate(n,n,n,e)}return this._calculate(t.expression.evaluate(new On(Math.floor(e.zoom-1),e)),t.expression.evaluate(new On(Math.floor(e.zoom),e)),t.expression.evaluate(new On(Math.floor(e.zoom+1),e)),e)}},Jn.prototype._calculate=function(t,e,r,n){return n.zoom>n.zoomHistory.lastIntegerZoom?{from:t,to:e}:{from:r,to:e}},Jn.prototype.interpolate=function(t){return t};var Hn=function(t){this.specification=t;};Hn.prototype.possiblyEvaluate=function(t,e,r){return !!t.expression.evaluate(e,null,{},r)},Hn.prototype.interpolate=function(){return !1};var Yn=function(t){for(var e in this.properties=t,this.defaultPropertyValues={},this.defaultTransitionablePropertyValues={},this.defaultTransitioningPropertyValues={},this.defaultPossiblyEvaluatedValues={},this.overridableProperties=[],t){var r=t[e];r.specification.overridable&&this.overridableProperties.push(e);var n=this.defaultPropertyValues[e]=new Ln(r,void 0),i=this.defaultTransitionablePropertyValues[e]=new Dn(r);this.defaultTransitioningPropertyValues[e]=i.untransitioned(),this.defaultPossiblyEvaluatedValues[e]=n.possiblyEvaluate({});}};xn("DataDrivenProperty",Xn),xn("DataConstantProperty",Zn),xn("CrossFadedDataDrivenProperty",Gn),xn("CrossFadedProperty",Jn),xn("ColorRampProperty",Hn);var $n=function(t){function e(e,r){if(t.call(this),this.id=e.id,this.type=e.type,this._featureFilter=function(){return !0},"custom"!==e.type&&(e=e,this.metadata=e.metadata,this.minzoom=e.minzoom,this.maxzoom=e.maxzoom,"background"!==e.type&&(this.source=e.source,this.sourceLayer=e["source-layer"],this.filter=e.filter),r.layout&&(this._unevaluatedLayout=new qn(r.layout)),r.paint)){for(var n in this._transitionablePaint=new Un(r.paint),e.paint)this.setPaintProperty(n,e.paint[n],{validate:!1});for(var i in e.layout)this.setLayoutProperty(i,e.layout[i],{validate:!1});this._transitioningPaint=this._transitionablePaint.untransitioned();}}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getCrossfadeParameters=function(){return this._crossfadeParameters},e.prototype.getLayoutProperty=function(t){return "visibility"===t?this.visibility:this._unevaluatedLayout.getValue(t)},e.prototype.setLayoutProperty=function(t,e,r){if(void 0===r&&(r={}),null!=e){var n="layers."+this.id+".layout."+t;if(this._validate(hn,n,t,e,r))return}"visibility"!==t?this._unevaluatedLayout.setValue(t,e):this.visibility=e;},e.prototype.getPaintProperty=function(t){return v(t,"-transition")?this._transitionablePaint.getTransition(t.slice(0,-"-transition".length)):this._transitionablePaint.getValue(t)},e.prototype.setPaintProperty=function(t,e,r){if(void 0===r&&(r={}),null!=e){var n="layers."+this.id+".paint."+t;if(this._validate(cn,n,t,e,r))return !1}if(v(t,"-transition"))return this._transitionablePaint.setTransition(t.slice(0,-"-transition".length),e||void 0),!1;var i=this._transitionablePaint._values[t],a="cross-faded-data-driven"===i.property.specification["property-type"],o=i.value.isDataDriven(),s=i.value;this._transitionablePaint.setValue(t,e),this._handleSpecialPaintPropertyUpdate(t);var u=this._transitionablePaint._values[t].value;return u.isDataDriven()||o||a||this._handleOverridablePaintPropertyUpdate(t,s,u)},e.prototype._handleSpecialPaintPropertyUpdate=function(t){},e.prototype._handleOverridablePaintPropertyUpdate=function(t,e,r){return !1},e.prototype.isHidden=function(t){return !!(this.minzoom&&t<this.minzoom)||(!!(this.maxzoom&&t>=this.maxzoom)||"none"===this.visibility)},e.prototype.updateTransitions=function(t){this._transitioningPaint=this._transitionablePaint.transitioned(t,this._transitioningPaint);},e.prototype.hasTransition=function(){return this._transitioningPaint.hasTransition()},e.prototype.recalculate=function(t,e){t.getCrossfadeParameters&&(this._crossfadeParameters=t.getCrossfadeParameters()),this._unevaluatedLayout&&(this.layout=this._unevaluatedLayout.possiblyEvaluate(t,e)),this.paint=this._transitioningPaint.possiblyEvaluate(t,e);},e.prototype.serialize=function(){var t={id:this.id,type:this.type,source:this.source,"source-layer":this.sourceLayer,metadata:this.metadata,minzoom:this.minzoom,maxzoom:this.maxzoom,filter:this.filter,layout:this._unevaluatedLayout&&this._unevaluatedLayout.serialize(),paint:this._transitionablePaint&&this._transitionablePaint.serialize()};return this.visibility&&(t.layout=t.layout||{},t.layout.visibility=this.visibility),x(t,(function(t,e){return !(void 0===t||"layout"===e&&!Object.keys(t).length||"paint"===e&&!Object.keys(t).length)}))},e.prototype._validate=function(t,e,r,n,i){return void 0===i&&(i={}),(!i||!1!==i.validate)&&fn(this,t.call(ln,{key:e,layerType:this.type,objectKey:r,value:n,styleSpec:zt,style:{glyphs:!0,sprite:!0}}))},e.prototype.is3D=function(){return !1},e.prototype.isTileClipped=function(){return !1},e.prototype.hasOffscreenPass=function(){return !1},e.prototype.resize=function(){},e.prototype.isStateDependent=function(){for(var t in this.paint._values){var e=this.paint.get(t);if(e instanceof Nn&&dr(e.property.specification)&&(("source"===e.value.kind||"composite"===e.value.kind)&&e.value.isStateDependent))return !0}return !1},e}(St),Wn={Int8:Int8Array,Uint8:Uint8Array,Int16:Int16Array,Uint16:Uint16Array,Int32:Int32Array,Uint32:Uint32Array,Float32:Float32Array},Qn=function(t,e){this._structArray=t,this._pos1=e*this.size,this._pos2=this._pos1/2,this._pos4=this._pos1/4,this._pos8=this._pos1/8;},ti=function(){this.isTransferred=!1,this.capacity=-1,this.resize(0);};function ei(t,e){void 0===e&&(e=1);var r=0,n=0;return {members:t.map((function(t){var i,a=(i=t.type,Wn[i].BYTES_PER_ELEMENT),o=r=ri(r,Math.max(e,a)),s=t.components||1;return n=Math.max(n,a),r+=a*s,{name:t.name,type:t.type,components:s,offset:o}})),size:ri(r,Math.max(n,e)),alignment:e}}function ri(t,e){return Math.ceil(t/e)*e}ti.serialize=function(t,e){return t._trim(),e&&(t.isTransferred=!0,e.push(t.arrayBuffer)),{length:t.length,arrayBuffer:t.arrayBuffer}},ti.deserialize=function(t){var e=Object.create(this.prototype);return e.arrayBuffer=t.arrayBuffer,e.length=t.length,e.capacity=t.arrayBuffer.byteLength/e.bytesPerElement,e._refreshViews(),e},ti.prototype._trim=function(){this.length!==this.capacity&&(this.capacity=this.length,this.arrayBuffer=this.arrayBuffer.slice(0,this.length*this.bytesPerElement),this._refreshViews());},ti.prototype.clear=function(){this.length=0;},ti.prototype.resize=function(t){this.reserve(t),this.length=t;},ti.prototype.reserve=function(t){if(t>this.capacity){this.capacity=Math.max(t,Math.floor(5*this.capacity),128),this.arrayBuffer=new ArrayBuffer(this.capacity*this.bytesPerElement);var e=this.uint8;this._refreshViews(),e&&this.uint8.set(e);}},ti.prototype._refreshViews=function(){throw new Error("_refreshViews() must be implemented by each concrete StructArray layout")};var ni=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e){var r=this.length;return this.resize(r+1),this.emplace(r,t,e)},e.prototype.emplace=function(t,e,r){var n=2*t;return this.int16[n+0]=e,this.int16[n+1]=r,t},e}(ti);ni.prototype.bytesPerElement=4,xn("StructArrayLayout2i4",ni);var ii=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n){var i=this.length;return this.resize(i+1),this.emplace(i,t,e,r,n)},e.prototype.emplace=function(t,e,r,n,i){var a=4*t;return this.int16[a+0]=e,this.int16[a+1]=r,this.int16[a+2]=n,this.int16[a+3]=i,t},e}(ti);ii.prototype.bytesPerElement=8,xn("StructArrayLayout4i8",ii);var ai=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a){var o=this.length;return this.resize(o+1),this.emplace(o,t,e,r,n,i,a)},e.prototype.emplace=function(t,e,r,n,i,a,o){var s=6*t;return this.int16[s+0]=e,this.int16[s+1]=r,this.int16[s+2]=n,this.int16[s+3]=i,this.int16[s+4]=a,this.int16[s+5]=o,t},e}(ti);ai.prototype.bytesPerElement=12,xn("StructArrayLayout2i4i12",ai);var oi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a){var o=this.length;return this.resize(o+1),this.emplace(o,t,e,r,n,i,a)},e.prototype.emplace=function(t,e,r,n,i,a,o){var s=4*t,u=8*t;return this.int16[s+0]=e,this.int16[s+1]=r,this.uint8[u+4]=n,this.uint8[u+5]=i,this.uint8[u+6]=a,this.uint8[u+7]=o,t},e}(ti);oi.prototype.bytesPerElement=8,xn("StructArrayLayout2i4ub8",oi);var si=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a,o,s){var u=this.length;return this.resize(u+1),this.emplace(u,t,e,r,n,i,a,o,s)},e.prototype.emplace=function(t,e,r,n,i,a,o,s,u){var l=8*t;return this.uint16[l+0]=e,this.uint16[l+1]=r,this.uint16[l+2]=n,this.uint16[l+3]=i,this.uint16[l+4]=a,this.uint16[l+5]=o,this.uint16[l+6]=s,this.uint16[l+7]=u,t},e}(ti);si.prototype.bytesPerElement=16,xn("StructArrayLayout8ui16",si);var ui=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a,o,s){var u=this.length;return this.resize(u+1),this.emplace(u,t,e,r,n,i,a,o,s)},e.prototype.emplace=function(t,e,r,n,i,a,o,s,u){var l=8*t;return this.int16[l+0]=e,this.int16[l+1]=r,this.int16[l+2]=n,this.int16[l+3]=i,this.uint16[l+4]=a,this.uint16[l+5]=o,this.uint16[l+6]=s,this.uint16[l+7]=u,t},e}(ti);ui.prototype.bytesPerElement=16,xn("StructArrayLayout4i4ui16",ui);var li=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r){var n=this.length;return this.resize(n+1),this.emplace(n,t,e,r)},e.prototype.emplace=function(t,e,r,n){var i=3*t;return this.float32[i+0]=e,this.float32[i+1]=r,this.float32[i+2]=n,t},e}(ti);li.prototype.bytesPerElement=12,xn("StructArrayLayout3f12",li);var pi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint32=new Uint32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t){var e=this.length;return this.resize(e+1),this.emplace(e,t)},e.prototype.emplace=function(t,e){var r=1*t;return this.uint32[r+0]=e,t},e}(ti);pi.prototype.bytesPerElement=4,xn("StructArrayLayout1ul4",pi);var ci=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer),this.uint32=new Uint32Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a,o,s,u,l,p){var c=this.length;return this.resize(c+1),this.emplace(c,t,e,r,n,i,a,o,s,u,l,p)},e.prototype.emplace=function(t,e,r,n,i,a,o,s,u,l,p,c){var h=12*t,f=6*t;return this.int16[h+0]=e,this.int16[h+1]=r,this.int16[h+2]=n,this.int16[h+3]=i,this.int16[h+4]=a,this.int16[h+5]=o,this.uint32[f+3]=s,this.uint16[h+8]=u,this.uint16[h+9]=l,this.int16[h+10]=p,this.int16[h+11]=c,t},e}(ti);ci.prototype.bytesPerElement=24,xn("StructArrayLayout6i1ul2ui2i24",ci);var hi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a){var o=this.length;return this.resize(o+1),this.emplace(o,t,e,r,n,i,a)},e.prototype.emplace=function(t,e,r,n,i,a,o){var s=6*t;return this.int16[s+0]=e,this.int16[s+1]=r,this.int16[s+2]=n,this.int16[s+3]=i,this.int16[s+4]=a,this.int16[s+5]=o,t},e}(ti);hi.prototype.bytesPerElement=12,xn("StructArrayLayout2i2i2i12",hi);var fi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n){var i=this.length;return this.resize(i+1),this.emplace(i,t,e,r,n)},e.prototype.emplace=function(t,e,r,n,i){var a=12*t,o=3*t;return this.uint8[a+0]=e,this.uint8[a+1]=r,this.float32[o+1]=n,this.float32[o+2]=i,t},e}(ti);fi.prototype.bytesPerElement=12,xn("StructArrayLayout2ub2f12",fi);var yi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer),this.uint32=new Uint32Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m){var v=this.length;return this.resize(v+1),this.emplace(v,t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m)},e.prototype.emplace=function(t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m,v){var g=24*t,x=12*t,b=48*t;return this.int16[g+0]=e,this.int16[g+1]=r,this.uint16[g+2]=n,this.uint16[g+3]=i,this.uint32[x+2]=a,this.uint32[x+3]=o,this.uint32[x+4]=s,this.uint16[g+10]=u,this.uint16[g+11]=l,this.uint16[g+12]=p,this.float32[x+7]=c,this.float32[x+8]=h,this.uint8[b+36]=f,this.uint8[b+37]=y,this.uint8[b+38]=d,this.uint32[x+10]=m,this.int16[g+22]=v,t},e}(ti);yi.prototype.bytesPerElement=48,xn("StructArrayLayout2i2ui3ul3ui2f3ub1ul1i48",yi);var di=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer),this.uint32=new Uint32Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m,v,g,x,b,_){var w=this.length;return this.resize(w+1),this.emplace(w,t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m,v,g,x,b,_)},e.prototype.emplace=function(t,e,r,n,i,a,o,s,u,l,p,c,h,f,y,d,m,v,g,x,b,_,w){var A=26*t,k=13*t;return this.int16[A+0]=e,this.int16[A+1]=r,this.int16[A+2]=n,this.int16[A+3]=i,this.int16[A+4]=a,this.int16[A+5]=o,this.int16[A+6]=s,this.uint16[A+7]=u,this.uint16[A+8]=l,this.uint16[A+9]=p,this.uint16[A+10]=c,this.uint16[A+11]=h,this.uint16[A+12]=f,this.uint16[A+13]=y,this.uint16[A+14]=d,this.uint16[A+15]=m,this.uint16[A+16]=v,this.uint16[A+17]=g,this.uint32[k+9]=x,this.float32[k+10]=b,this.float32[k+11]=_,this.float32[k+12]=w,t},e}(ti);di.prototype.bytesPerElement=52,xn("StructArrayLayout7i11ui1ul3f52",di);var mi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t){var e=this.length;return this.resize(e+1),this.emplace(e,t)},e.prototype.emplace=function(t,e){var r=1*t;return this.float32[r+0]=e,t},e}(ti);mi.prototype.bytesPerElement=4,xn("StructArrayLayout1f4",mi);var vi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.int16=new Int16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r){var n=this.length;return this.resize(n+1),this.emplace(n,t,e,r)},e.prototype.emplace=function(t,e,r,n){var i=3*t;return this.int16[i+0]=e,this.int16[i+1]=r,this.int16[i+2]=n,t},e}(ti);vi.prototype.bytesPerElement=6,xn("StructArrayLayout3i6",vi);var gi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint32=new Uint32Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r){var n=this.length;return this.resize(n+1),this.emplace(n,t,e,r)},e.prototype.emplace=function(t,e,r,n){var i=2*t,a=4*t;return this.uint32[i+0]=e,this.uint16[a+2]=r,this.uint16[a+3]=n,t},e}(ti);gi.prototype.bytesPerElement=8,xn("StructArrayLayout1ul2ui8",gi);var xi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r){var n=this.length;return this.resize(n+1),this.emplace(n,t,e,r)},e.prototype.emplace=function(t,e,r,n){var i=3*t;return this.uint16[i+0]=e,this.uint16[i+1]=r,this.uint16[i+2]=n,t},e}(ti);xi.prototype.bytesPerElement=6,xn("StructArrayLayout3ui6",xi);var bi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e){var r=this.length;return this.resize(r+1),this.emplace(r,t,e)},e.prototype.emplace=function(t,e,r){var n=2*t;return this.uint16[n+0]=e,this.uint16[n+1]=r,t},e}(ti);bi.prototype.bytesPerElement=4,xn("StructArrayLayout2ui4",bi);var _i=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.uint16=new Uint16Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t){var e=this.length;return this.resize(e+1),this.emplace(e,t)},e.prototype.emplace=function(t,e){var r=1*t;return this.uint16[r+0]=e,t},e}(ti);_i.prototype.bytesPerElement=2,xn("StructArrayLayout1ui2",_i);var wi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e){var r=this.length;return this.resize(r+1),this.emplace(r,t,e)},e.prototype.emplace=function(t,e,r){var n=2*t;return this.float32[n+0]=e,this.float32[n+1]=r,t},e}(ti);wi.prototype.bytesPerElement=8,xn("StructArrayLayout2f8",wi);var Ai=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._refreshViews=function(){this.uint8=new Uint8Array(this.arrayBuffer),this.float32=new Float32Array(this.arrayBuffer);},e.prototype.emplaceBack=function(t,e,r,n){var i=this.length;return this.resize(i+1),this.emplace(i,t,e,r,n)},e.prototype.emplace=function(t,e,r,n,i){var a=4*t;return this.float32[a+0]=e,this.float32[a+1]=r,this.float32[a+2]=n,this.float32[a+3]=i,t},e}(ti);Ai.prototype.bytesPerElement=16,xn("StructArrayLayout4f16",Ai);var ki=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={anchorPointX:{configurable:!0},anchorPointY:{configurable:!0},x1:{configurable:!0},y1:{configurable:!0},x2:{configurable:!0},y2:{configurable:!0},featureIndex:{configurable:!0},sourceLayerIndex:{configurable:!0},bucketIndex:{configurable:!0},radius:{configurable:!0},signedDistanceFromAnchor:{configurable:!0},anchorPoint:{configurable:!0}};return r.anchorPointX.get=function(){return this._structArray.int16[this._pos2+0]},r.anchorPointX.set=function(t){this._structArray.int16[this._pos2+0]=t;},r.anchorPointY.get=function(){return this._structArray.int16[this._pos2+1]},r.anchorPointY.set=function(t){this._structArray.int16[this._pos2+1]=t;},r.x1.get=function(){return this._structArray.int16[this._pos2+2]},r.x1.set=function(t){this._structArray.int16[this._pos2+2]=t;},r.y1.get=function(){return this._structArray.int16[this._pos2+3]},r.y1.set=function(t){this._structArray.int16[this._pos2+3]=t;},r.x2.get=function(){return this._structArray.int16[this._pos2+4]},r.x2.set=function(t){this._structArray.int16[this._pos2+4]=t;},r.y2.get=function(){return this._structArray.int16[this._pos2+5]},r.y2.set=function(t){this._structArray.int16[this._pos2+5]=t;},r.featureIndex.get=function(){return this._structArray.uint32[this._pos4+3]},r.featureIndex.set=function(t){this._structArray.uint32[this._pos4+3]=t;},r.sourceLayerIndex.get=function(){return this._structArray.uint16[this._pos2+8]},r.sourceLayerIndex.set=function(t){this._structArray.uint16[this._pos2+8]=t;},r.bucketIndex.get=function(){return this._structArray.uint16[this._pos2+9]},r.bucketIndex.set=function(t){this._structArray.uint16[this._pos2+9]=t;},r.radius.get=function(){return this._structArray.int16[this._pos2+10]},r.radius.set=function(t){this._structArray.int16[this._pos2+10]=t;},r.signedDistanceFromAnchor.get=function(){return this._structArray.int16[this._pos2+11]},r.signedDistanceFromAnchor.set=function(t){this._structArray.int16[this._pos2+11]=t;},r.anchorPoint.get=function(){return new i(this.anchorPointX,this.anchorPointY)},Object.defineProperties(e.prototype,r),e}(Qn);ki.prototype.size=24;var Si=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.get=function(t){return new ki(this,t)},e}(ci);xn("CollisionBoxArray",Si);var zi=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={anchorX:{configurable:!0},anchorY:{configurable:!0},glyphStartIndex:{configurable:!0},numGlyphs:{configurable:!0},vertexStartIndex:{configurable:!0},lineStartIndex:{configurable:!0},lineLength:{configurable:!0},segment:{configurable:!0},lowerSize:{configurable:!0},upperSize:{configurable:!0},lineOffsetX:{configurable:!0},lineOffsetY:{configurable:!0},writingMode:{configurable:!0},placedOrientation:{configurable:!0},hidden:{configurable:!0},crossTileID:{configurable:!0},associatedIconIndex:{configurable:!0}};return r.anchorX.get=function(){return this._structArray.int16[this._pos2+0]},r.anchorX.set=function(t){this._structArray.int16[this._pos2+0]=t;},r.anchorY.get=function(){return this._structArray.int16[this._pos2+1]},r.anchorY.set=function(t){this._structArray.int16[this._pos2+1]=t;},r.glyphStartIndex.get=function(){return this._structArray.uint16[this._pos2+2]},r.glyphStartIndex.set=function(t){this._structArray.uint16[this._pos2+2]=t;},r.numGlyphs.get=function(){return this._structArray.uint16[this._pos2+3]},r.numGlyphs.set=function(t){this._structArray.uint16[this._pos2+3]=t;},r.vertexStartIndex.get=function(){return this._structArray.uint32[this._pos4+2]},r.vertexStartIndex.set=function(t){this._structArray.uint32[this._pos4+2]=t;},r.lineStartIndex.get=function(){return this._structArray.uint32[this._pos4+3]},r.lineStartIndex.set=function(t){this._structArray.uint32[this._pos4+3]=t;},r.lineLength.get=function(){return this._structArray.uint32[this._pos4+4]},r.lineLength.set=function(t){this._structArray.uint32[this._pos4+4]=t;},r.segment.get=function(){return this._structArray.uint16[this._pos2+10]},r.segment.set=function(t){this._structArray.uint16[this._pos2+10]=t;},r.lowerSize.get=function(){return this._structArray.uint16[this._pos2+11]},r.lowerSize.set=function(t){this._structArray.uint16[this._pos2+11]=t;},r.upperSize.get=function(){return this._structArray.uint16[this._pos2+12]},r.upperSize.set=function(t){this._structArray.uint16[this._pos2+12]=t;},r.lineOffsetX.get=function(){return this._structArray.float32[this._pos4+7]},r.lineOffsetX.set=function(t){this._structArray.float32[this._pos4+7]=t;},r.lineOffsetY.get=function(){return this._structArray.float32[this._pos4+8]},r.lineOffsetY.set=function(t){this._structArray.float32[this._pos4+8]=t;},r.writingMode.get=function(){return this._structArray.uint8[this._pos1+36]},r.writingMode.set=function(t){this._structArray.uint8[this._pos1+36]=t;},r.placedOrientation.get=function(){return this._structArray.uint8[this._pos1+37]},r.placedOrientation.set=function(t){this._structArray.uint8[this._pos1+37]=t;},r.hidden.get=function(){return this._structArray.uint8[this._pos1+38]},r.hidden.set=function(t){this._structArray.uint8[this._pos1+38]=t;},r.crossTileID.get=function(){return this._structArray.uint32[this._pos4+10]},r.crossTileID.set=function(t){this._structArray.uint32[this._pos4+10]=t;},r.associatedIconIndex.get=function(){return this._structArray.int16[this._pos2+22]},r.associatedIconIndex.set=function(t){this._structArray.int16[this._pos2+22]=t;},Object.defineProperties(e.prototype,r),e}(Qn);zi.prototype.size=48;var Ii=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.get=function(t){return new zi(this,t)},e}(yi);xn("PlacedSymbolArray",Ii);var Ci=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={anchorX:{configurable:!0},anchorY:{configurable:!0},rightJustifiedTextSymbolIndex:{configurable:!0},centerJustifiedTextSymbolIndex:{configurable:!0},leftJustifiedTextSymbolIndex:{configurable:!0},verticalPlacedTextSymbolIndex:{configurable:!0},placedIconSymbolIndex:{configurable:!0},key:{configurable:!0},textBoxStartIndex:{configurable:!0},textBoxEndIndex:{configurable:!0},verticalTextBoxStartIndex:{configurable:!0},verticalTextBoxEndIndex:{configurable:!0},iconBoxStartIndex:{configurable:!0},iconBoxEndIndex:{configurable:!0},featureIndex:{configurable:!0},numHorizontalGlyphVertices:{configurable:!0},numVerticalGlyphVertices:{configurable:!0},numIconVertices:{configurable:!0},crossTileID:{configurable:!0},textBoxScale:{configurable:!0},textOffset0:{configurable:!0},textOffset1:{configurable:!0}};return r.anchorX.get=function(){return this._structArray.int16[this._pos2+0]},r.anchorX.set=function(t){this._structArray.int16[this._pos2+0]=t;},r.anchorY.get=function(){return this._structArray.int16[this._pos2+1]},r.anchorY.set=function(t){this._structArray.int16[this._pos2+1]=t;},r.rightJustifiedTextSymbolIndex.get=function(){return this._structArray.int16[this._pos2+2]},r.rightJustifiedTextSymbolIndex.set=function(t){this._structArray.int16[this._pos2+2]=t;},r.centerJustifiedTextSymbolIndex.get=function(){return this._structArray.int16[this._pos2+3]},r.centerJustifiedTextSymbolIndex.set=function(t){this._structArray.int16[this._pos2+3]=t;},r.leftJustifiedTextSymbolIndex.get=function(){return this._structArray.int16[this._pos2+4]},r.leftJustifiedTextSymbolIndex.set=function(t){this._structArray.int16[this._pos2+4]=t;},r.verticalPlacedTextSymbolIndex.get=function(){return this._structArray.int16[this._pos2+5]},r.verticalPlacedTextSymbolIndex.set=function(t){this._structArray.int16[this._pos2+5]=t;},r.placedIconSymbolIndex.get=function(){return this._structArray.int16[this._pos2+6]},r.placedIconSymbolIndex.set=function(t){this._structArray.int16[this._pos2+6]=t;},r.key.get=function(){return this._structArray.uint16[this._pos2+7]},r.key.set=function(t){this._structArray.uint16[this._pos2+7]=t;},r.textBoxStartIndex.get=function(){return this._structArray.uint16[this._pos2+8]},r.textBoxStartIndex.set=function(t){this._structArray.uint16[this._pos2+8]=t;},r.textBoxEndIndex.get=function(){return this._structArray.uint16[this._pos2+9]},r.textBoxEndIndex.set=function(t){this._structArray.uint16[this._pos2+9]=t;},r.verticalTextBoxStartIndex.get=function(){return this._structArray.uint16[this._pos2+10]},r.verticalTextBoxStartIndex.set=function(t){this._structArray.uint16[this._pos2+10]=t;},r.verticalTextBoxEndIndex.get=function(){return this._structArray.uint16[this._pos2+11]},r.verticalTextBoxEndIndex.set=function(t){this._structArray.uint16[this._pos2+11]=t;},r.iconBoxStartIndex.get=function(){return this._structArray.uint16[this._pos2+12]},r.iconBoxStartIndex.set=function(t){this._structArray.uint16[this._pos2+12]=t;},r.iconBoxEndIndex.get=function(){return this._structArray.uint16[this._pos2+13]},r.iconBoxEndIndex.set=function(t){this._structArray.uint16[this._pos2+13]=t;},r.featureIndex.get=function(){return this._structArray.uint16[this._pos2+14]},r.featureIndex.set=function(t){this._structArray.uint16[this._pos2+14]=t;},r.numHorizontalGlyphVertices.get=function(){return this._structArray.uint16[this._pos2+15]},r.numHorizontalGlyphVertices.set=function(t){this._structArray.uint16[this._pos2+15]=t;},r.numVerticalGlyphVertices.get=function(){return this._structArray.uint16[this._pos2+16]},r.numVerticalGlyphVertices.set=function(t){this._structArray.uint16[this._pos2+16]=t;},r.numIconVertices.get=function(){return this._structArray.uint16[this._pos2+17]},r.numIconVertices.set=function(t){this._structArray.uint16[this._pos2+17]=t;},r.crossTileID.get=function(){return this._structArray.uint32[this._pos4+9]},r.crossTileID.set=function(t){this._structArray.uint32[this._pos4+9]=t;},r.textBoxScale.get=function(){return this._structArray.float32[this._pos4+10]},r.textBoxScale.set=function(t){this._structArray.float32[this._pos4+10]=t;},r.textOffset0.get=function(){return this._structArray.float32[this._pos4+11]},r.textOffset0.set=function(t){this._structArray.float32[this._pos4+11]=t;},r.textOffset1.get=function(){return this._structArray.float32[this._pos4+12]},r.textOffset1.set=function(t){this._structArray.float32[this._pos4+12]=t;},Object.defineProperties(e.prototype,r),e}(Qn);Ci.prototype.size=52;var Bi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.get=function(t){return new Ci(this,t)},e}(di);xn("SymbolInstanceArray",Bi);var Ei=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={offsetX:{configurable:!0}};return r.offsetX.get=function(){return this._structArray.float32[this._pos4+0]},r.offsetX.set=function(t){this._structArray.float32[this._pos4+0]=t;},Object.defineProperties(e.prototype,r),e}(Qn);Ei.prototype.size=4;var Mi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getoffsetX=function(t){return this.float32[1*t+0]},e.prototype.get=function(t){return new Ei(this,t)},e}(mi);xn("GlyphOffsetArray",Mi);var Pi=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={x:{configurable:!0},y:{configurable:!0},tileUnitDistanceFromAnchor:{configurable:!0}};return r.x.get=function(){return this._structArray.int16[this._pos2+0]},r.x.set=function(t){this._structArray.int16[this._pos2+0]=t;},r.y.get=function(){return this._structArray.int16[this._pos2+1]},r.y.set=function(t){this._structArray.int16[this._pos2+1]=t;},r.tileUnitDistanceFromAnchor.get=function(){return this._structArray.int16[this._pos2+2]},r.tileUnitDistanceFromAnchor.set=function(t){this._structArray.int16[this._pos2+2]=t;},Object.defineProperties(e.prototype,r),e}(Qn);Pi.prototype.size=6;var Ti=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getx=function(t){return this.int16[3*t+0]},e.prototype.gety=function(t){return this.int16[3*t+1]},e.prototype.gettileUnitDistanceFromAnchor=function(t){return this.int16[3*t+2]},e.prototype.get=function(t){return new Pi(this,t)},e}(vi);xn("SymbolLineVertexArray",Ti);var Vi=function(t){function e(){t.apply(this,arguments);}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var r={featureIndex:{configurable:!0},sourceLayerIndex:{configurable:!0},bucketIndex:{configurable:!0}};return r.featureIndex.get=function(){return this._structArray.uint32[this._pos4+0]},r.featureIndex.set=function(t){this._structArray.uint32[this._pos4+0]=t;},r.sourceLayerIndex.get=function(){return this._structArray.uint16[this._pos2+2]},r.sourceLayerIndex.set=function(t){this._structArray.uint16[this._pos2+2]=t;},r.bucketIndex.get=function(){return this._structArray.uint16[this._pos2+3]},r.bucketIndex.set=function(t){this._structArray.uint16[this._pos2+3]=t;},Object.defineProperties(e.prototype,r),e}(Qn);Vi.prototype.size=8;var Fi=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.get=function(t){return new Vi(this,t)},e}(gi);xn("FeatureIndexArray",Fi);var Oi=ei([{name:"a_pos",components:2,type:"Int16"}],4).members,Li=function(t){void 0===t&&(t=[]),this.segments=t;};function Di(t,e){return 256*(t=l(Math.floor(t),0,255))+(e=l(Math.floor(e),0,255))}Li.prototype.prepareSegment=function(t,e,r,n){var i=this.segments[this.segments.length-1];return t>Li.MAX_VERTEX_ARRAY_LENGTH&&w("Max vertices per segment is "+Li.MAX_VERTEX_ARRAY_LENGTH+": bucket requested "+t),(!i||i.vertexLength+t>Li.MAX_VERTEX_ARRAY_LENGTH||i.sortKey!==n)&&(i={vertexOffset:e.length,primitiveOffset:r.length,vertexLength:0,primitiveLength:0},void 0!==n&&(i.sortKey=n),this.segments.push(i)),i},Li.prototype.get=function(){return this.segments},Li.prototype.destroy=function(){for(var t=0,e=this.segments;t<e.length;t+=1){var r=e[t];for(var n in r.vaos)r.vaos[n].destroy();}},Li.simpleSegment=function(t,e,r,n){return new Li([{vertexOffset:t,primitiveOffset:e,vertexLength:r,primitiveLength:n,vaos:{},sortKey:0}])},Li.MAX_VERTEX_ARRAY_LENGTH=Math.pow(2,16)-1,xn("SegmentVector",Li);var Ui=function(){this.ids=[],this.positions=[],this.indexed=!1;};function Ri(t,e,r){var n=t[e];t[e]=t[r],t[r]=n;}Ui.prototype.add=function(t,e,r,n){this.ids.push(t),this.positions.push(e,r,n);},Ui.prototype.getPositions=function(t){for(var e=0,r=this.ids.length-1;e<r;){var n=e+r>>1;this.ids[n]>=t?r=n:e=n+1;}for(var i=[];this.ids[e]===t;){var a=this.positions[3*e],o=this.positions[3*e+1],s=this.positions[3*e+2];i.push({index:a,start:o,end:s}),e++;}return i},Ui.serialize=function(t,e){var r=new Float64Array(t.ids),n=new Uint32Array(t.positions);return function t(e,r,n,i){if(n>=i)return;var a=e[n+i>>1];var o=n-1;var s=i+1;for(;;){do{o++;}while(e[o]<a);do{s--;}while(e[s]>a);if(o>=s)break;Ri(e,o,s),Ri(r,3*o,3*s),Ri(r,3*o+1,3*s+1),Ri(r,3*o+2,3*s+2);}t(e,r,n,s);t(e,r,s+1,i);}(r,n,0,r.length-1),e.push(r.buffer,n.buffer),{ids:r,positions:n}},Ui.deserialize=function(t){var e=new Ui;return e.ids=t.ids,e.positions=t.positions,e.indexed=!0,e},xn("FeaturePositionMap",Ui);var ji=function(t,e){this.gl=t.gl,this.location=e;},qi=function(t){function e(e,r){t.call(this,e,r),this.current=0;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){this.current!==t&&(this.current=t,this.gl.uniform1i(this.location,t));},e}(ji),Ni=function(t){function e(e,r){t.call(this,e,r),this.current=0;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){this.current!==t&&(this.current=t,this.gl.uniform1f(this.location,t));},e}(ji),Ki=function(t){function e(e,r){t.call(this,e,r),this.current=[0,0];}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){t[0]===this.current[0]&&t[1]===this.current[1]||(this.current=t,this.gl.uniform2f(this.location,t[0],t[1]));},e}(ji),Zi=function(t){function e(e,r){t.call(this,e,r),this.current=[0,0,0];}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){t[0]===this.current[0]&&t[1]===this.current[1]&&t[2]===this.current[2]||(this.current=t,this.gl.uniform3f(this.location,t[0],t[1],t[2]));},e}(ji),Xi=function(t){function e(e,r){t.call(this,e,r),this.current=[0,0,0,0];}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){t[0]===this.current[0]&&t[1]===this.current[1]&&t[2]===this.current[2]&&t[3]===this.current[3]||(this.current=t,this.gl.uniform4f(this.location,t[0],t[1],t[2],t[3]));},e}(ji),Gi=function(t){function e(e,r){t.call(this,e,r),this.current=Yt.transparent;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){t.r===this.current.r&&t.g===this.current.g&&t.b===this.current.b&&t.a===this.current.a||(this.current=t,this.gl.uniform4f(this.location,t.r,t.g,t.b,t.a));},e}(ji),Ji=new Float32Array(16),Hi=function(t){function e(e,r){t.call(this,e,r),this.current=Ji;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){if(t[12]!==this.current[12]||t[0]!==this.current[0])return this.current=t,void this.gl.uniformMatrix4fv(this.location,!1,t);for(var e=1;e<16;e++)if(t[e]!==this.current[e]){this.current=t,this.gl.uniformMatrix4fv(this.location,!1,t);break}},e}(ji);function Yi(t){return [Di(255*t.r,255*t.g),Di(255*t.b,255*t.a)]}var $i=function(t,e,r){this.value=t,this.names=e,this.uniformNames=this.names.map((function(t){return "u_"+t})),this.type=r,this.maxValue=-1/0;};$i.prototype.defines=function(){return this.names.map((function(t){return "#define HAS_UNIFORM_u_"+t}))},$i.prototype.setConstantPatternPositions=function(){},$i.prototype.populatePaintArray=function(){},$i.prototype.updatePaintArray=function(){},$i.prototype.upload=function(){},$i.prototype.destroy=function(){},$i.prototype.setUniforms=function(t,e,r,n){e.set(n.constantOr(this.value));},$i.prototype.getBinding=function(t,e){return "color"===this.type?new Gi(t,e):new Ni(t,e)},$i.serialize=function(t){var e=t.value,r=t.names,n=t.type;return {value:_n(e),names:r,type:n}},$i.deserialize=function(t){var e=t.value,r=t.names,n=t.type;return new $i(wn(e),r,n)};var Wi=function(t,e,r){this.value=t,this.names=e,this.uniformNames=this.names.map((function(t){return "u_"+t})),this.type=r,this.maxValue=-1/0,this.patternPositions={patternTo:null,patternFrom:null};};Wi.prototype.defines=function(){return this.names.map((function(t){return "#define HAS_UNIFORM_u_"+t}))},Wi.prototype.populatePaintArray=function(){},Wi.prototype.updatePaintArray=function(){},Wi.prototype.upload=function(){},Wi.prototype.destroy=function(){},Wi.prototype.setConstantPatternPositions=function(t,e){this.patternPositions.patternTo=t.tlbr,this.patternPositions.patternFrom=e.tlbr;},Wi.prototype.setUniforms=function(t,e,r,n,i){var a=this.patternPositions;"u_pattern_to"===i&&a.patternTo&&e.set(a.patternTo),"u_pattern_from"===i&&a.patternFrom&&e.set(a.patternFrom);},Wi.prototype.getBinding=function(t,e){return new Xi(t,e)};var Qi=function(t,e,r,n){this.expression=t,this.names=e,this.type=r,this.uniformNames=this.names.map((function(t){return "a_"+t})),this.maxValue=-1/0,this.paintVertexAttributes=e.map((function(t){return {name:"a_"+t,type:"Float32",components:"color"===r?2:1,offset:0}})),this.paintVertexArray=new n;};Qi.prototype.defines=function(){return []},Qi.prototype.setConstantPatternPositions=function(){},Qi.prototype.populatePaintArray=function(t,e,r,n){var i=this.paintVertexArray,a=i.length;i.reserve(t);var o=this.expression.evaluate(new On(0),e,{},[],n);if("color"===this.type)for(var s=Yi(o),u=a;u<t;u++)i.emplaceBack(s[0],s[1]);else{for(var l=a;l<t;l++)i.emplaceBack(o);this.maxValue=Math.max(this.maxValue,o);}},Qi.prototype.updatePaintArray=function(t,e,r,n){var i=this.paintVertexArray,a=this.expression.evaluate({zoom:0},r,n);if("color"===this.type)for(var o=Yi(a),s=t;s<e;s++)i.emplace(s,o[0],o[1]);else{for(var u=t;u<e;u++)i.emplace(u,a);this.maxValue=Math.max(this.maxValue,a);}},Qi.prototype.upload=function(t){this.paintVertexArray&&this.paintVertexArray.arrayBuffer&&(this.paintVertexBuffer&&this.paintVertexBuffer.buffer?this.paintVertexBuffer.updateData(this.paintVertexArray):this.paintVertexBuffer=t.createVertexBuffer(this.paintVertexArray,this.paintVertexAttributes,this.expression.isStateDependent));},Qi.prototype.destroy=function(){this.paintVertexBuffer&&this.paintVertexBuffer.destroy();},Qi.prototype.setUniforms=function(t,e){e.set(0);},Qi.prototype.getBinding=function(t,e){return new Ni(t,e)};var ta=function(t,e,r,n,i,a){this.expression=t,this.names=e,this.uniformNames=this.names.map((function(t){return "u_"+t+"_t"})),this.type=r,this.useIntegerZoom=n,this.zoom=i,this.maxValue=-1/0;var o=a;this.paintVertexAttributes=e.map((function(t){return {name:"a_"+t,type:"Float32",components:"color"===r?4:2,offset:0}})),this.paintVertexArray=new o;};ta.prototype.defines=function(){return []},ta.prototype.setConstantPatternPositions=function(){},ta.prototype.populatePaintArray=function(t,e,r,n){var i=this.paintVertexArray,a=i.length;i.reserve(t);var o=this.expression.evaluate(new On(this.zoom),e,{},[],n),s=this.expression.evaluate(new On(this.zoom+1),e,{},[],n);if("color"===this.type)for(var u=Yi(o),l=Yi(s),p=a;p<t;p++)i.emplaceBack(u[0],u[1],l[0],l[1]);else{for(var c=a;c<t;c++)i.emplaceBack(o,s);this.maxValue=Math.max(this.maxValue,o,s);}},ta.prototype.updatePaintArray=function(t,e,r,n){var i=this.paintVertexArray,a=this.expression.evaluate({zoom:this.zoom},r,n),o=this.expression.evaluate({zoom:this.zoom+1},r,n);if("color"===this.type)for(var s=Yi(a),u=Yi(o),l=t;l<e;l++)i.emplace(l,s[0],s[1],u[0],u[1]);else{for(var p=t;p<e;p++)i.emplace(p,a,o);this.maxValue=Math.max(this.maxValue,a,o);}},ta.prototype.upload=function(t){this.paintVertexArray&&this.paintVertexArray.arrayBuffer&&(this.paintVertexBuffer&&this.paintVertexBuffer.buffer?this.paintVertexBuffer.updateData(this.paintVertexArray):this.paintVertexBuffer=t.createVertexBuffer(this.paintVertexArray,this.paintVertexAttributes,this.expression.isStateDependent));},ta.prototype.destroy=function(){this.paintVertexBuffer&&this.paintVertexBuffer.destroy();},ta.prototype.interpolationFactor=function(t){return this.useIntegerZoom?this.expression.interpolationFactor(Math.floor(t),this.zoom,this.zoom+1):this.expression.interpolationFactor(t,this.zoom,this.zoom+1)},ta.prototype.setUniforms=function(t,e,r){e.set(this.interpolationFactor(r.zoom));},ta.prototype.getBinding=function(t,e){return new Ni(t,e)};var ea=function(t,e,r,n,i,a,o){this.expression=t,this.names=e,this.type=r,this.uniformNames=this.names.map((function(t){return "u_"+t+"_t"})),this.useIntegerZoom=n,this.zoom=i,this.maxValue=-1/0,this.layerId=o,this.paintVertexAttributes=e.map((function(t){return {name:"a_"+t,type:"Uint16",components:4,offset:0}})),this.zoomInPaintVertexArray=new a,this.zoomOutPaintVertexArray=new a;};ea.prototype.defines=function(){return []},ea.prototype.setConstantPatternPositions=function(){},ea.prototype.populatePaintArray=function(t,e,r){var n=this.zoomInPaintVertexArray,i=this.zoomOutPaintVertexArray,a=this.layerId,o=n.length;if(n.reserve(t),i.reserve(t),r&&e.patterns&&e.patterns[a]){var s=e.patterns[a],u=s.min,l=s.mid,p=s.max,c=r[u],h=r[l],f=r[p];if(!c||!h||!f)return;for(var y=o;y<t;y++)n.emplaceBack(h.tl[0],h.tl[1],h.br[0],h.br[1],c.tl[0],c.tl[1],c.br[0],c.br[1]),i.emplaceBack(h.tl[0],h.tl[1],h.br[0],h.br[1],f.tl[0],f.tl[1],f.br[0],f.br[1]);}},ea.prototype.updatePaintArray=function(t,e,r,n,i){var a=this.zoomInPaintVertexArray,o=this.zoomOutPaintVertexArray,s=this.layerId;if(i&&r.patterns&&r.patterns[s]){var u=r.patterns[s],l=u.min,p=u.mid,c=u.max,h=i[l],f=i[p],y=i[c];if(!h||!f||!y)return;for(var d=t;d<e;d++)a.emplace(d,f.tl[0],f.tl[1],f.br[0],f.br[1],h.tl[0],h.tl[1],h.br[0],h.br[1]),o.emplace(d,f.tl[0],f.tl[1],f.br[0],f.br[1],y.tl[0],y.tl[1],y.br[0],y.br[1]);}},ea.prototype.upload=function(t){this.zoomInPaintVertexArray&&this.zoomInPaintVertexArray.arrayBuffer&&this.zoomOutPaintVertexArray&&this.zoomOutPaintVertexArray.arrayBuffer&&(this.zoomInPaintVertexBuffer=t.createVertexBuffer(this.zoomInPaintVertexArray,this.paintVertexAttributes,this.expression.isStateDependent),this.zoomOutPaintVertexBuffer=t.createVertexBuffer(this.zoomOutPaintVertexArray,this.paintVertexAttributes,this.expression.isStateDependent));},ea.prototype.destroy=function(){this.zoomOutPaintVertexBuffer&&this.zoomOutPaintVertexBuffer.destroy(),this.zoomInPaintVertexBuffer&&this.zoomInPaintVertexBuffer.destroy();},ea.prototype.setUniforms=function(t,e){e.set(0);},ea.prototype.getBinding=function(t,e){return new Ni(t,e)};var ra=function(){this.binders={},this.cacheKey="",this._buffers=[],this._featureMap=new Ui,this._bufferOffset=0;};ra.createDynamic=function(t,e,r){var n=new ra,i=[];for(var a in t.paint._values)if(r(a)){var o=t.paint.get(a);if(o instanceof Nn&&dr(o.property.specification)){var s=ia(a,t.type),u=o.property.specification.type,l=o.property.useIntegerZoom;if("cross-faded"===o.property.specification["property-type"]||"cross-faded-data-driven"===o.property.specification["property-type"])if("constant"===o.value.kind)n.binders[a]=new Wi(o.value.value,s,u),i.push("/u_"+a);else{var p=aa(a,u,"source");n.binders[a]=new ea(o.value,s,u,l,e,p,t.id),i.push("/a_"+a);}else if("constant"===o.value.kind)n.binders[a]=new $i(o.value.value,s,u),i.push("/u_"+a);else if("source"===o.value.kind){var c=aa(a,u,"source");n.binders[a]=new Qi(o.value,s,u,c),i.push("/a_"+a);}else{var h=aa(a,u,"composite");n.binders[a]=new ta(o.value,s,u,l,e,h),i.push("/z_"+a);}}}return n.cacheKey=i.sort().join(""),n},ra.prototype.populatePaintArrays=function(t,e,r,n,i){for(var a in this.binders){this.binders[a].populatePaintArray(t,e,n,i);}void 0!==e.id&&this._featureMap.add(+e.id,r,this._bufferOffset,t),this._bufferOffset=t;},ra.prototype.setConstantPatternPositions=function(t,e){for(var r in this.binders){this.binders[r].setConstantPatternPositions(t,e);}},ra.prototype.updatePaintArrays=function(t,e,r,n){var i=!1;for(var a in t)for(var o=0,s=this._featureMap.getPositions(+a);o<s.length;o+=1){var u=s[o],l=e.feature(u.index);for(var p in this.binders){var c=this.binders[p];if(!(c instanceof $i||c instanceof Wi)&&!0===c.expression.isStateDependent){var h=r.paint.get(p);c.expression=h.value,c.updatePaintArray(u.start,u.end,l,t[a],n),i=!0;}}}return i},ra.prototype.defines=function(){var t=[];for(var e in this.binders)t.push.apply(t,this.binders[e].defines());return t},ra.prototype.getPaintVertexBuffers=function(){return this._buffers},ra.prototype.getUniforms=function(t,e){var r=[];for(var n in this.binders)for(var i=this.binders[n],a=0,o=i.uniformNames;a<o.length;a+=1){var s=o[a];if(e[s]){var u=i.getBinding(t,e[s]);r.push({name:s,property:n,binding:u});}}return r},ra.prototype.setUniforms=function(t,e,r,n){for(var i=0,a=e;i<a.length;i+=1){var o=a[i],s=o.name,u=o.property,l=o.binding;this.binders[u].setUniforms(t,l,n,r.get(u),s);}},ra.prototype.updatePatternPaintBuffers=function(t){var e=[];for(var r in this.binders){var n=this.binders[r];if(n instanceof ea){var i=2===t.fromScale?n.zoomInPaintVertexBuffer:n.zoomOutPaintVertexBuffer;i&&e.push(i);}else(n instanceof Qi||n instanceof ta)&&n.paintVertexBuffer&&e.push(n.paintVertexBuffer);}this._buffers=e;},ra.prototype.upload=function(t){for(var e in this.binders)this.binders[e].upload(t);var r=[];for(var n in this.binders){var i=this.binders[n];(i instanceof Qi||i instanceof ta)&&i.paintVertexBuffer&&r.push(i.paintVertexBuffer);}this._buffers=r;},ra.prototype.destroy=function(){for(var t in this.binders)this.binders[t].destroy();};var na=function(t,e,r,n){void 0===n&&(n=function(){return !0}),this.programConfigurations={};for(var i=0,a=e;i<a.length;i+=1){var o=a[i];this.programConfigurations[o.id]=ra.createDynamic(o,r,n),this.programConfigurations[o.id].layoutAttributes=t;}this.needsUpload=!1;};function ia(t,e){return {"text-opacity":["opacity"],"icon-opacity":["opacity"],"text-color":["fill_color"],"icon-color":["fill_color"],"text-halo-color":["halo_color"],"icon-halo-color":["halo_color"],"text-halo-blur":["halo_blur"],"icon-halo-blur":["halo_blur"],"text-halo-width":["halo_width"],"icon-halo-width":["halo_width"],"line-gap-width":["gapwidth"],"line-pattern":["pattern_to","pattern_from"],"fill-pattern":["pattern_to","pattern_from"],"fill-extrusion-pattern":["pattern_to","pattern_from"]}[t]||[t.replace(e+"-","").replace(/-/g,"_")]}function aa(t,e,r){var n={color:{source:wi,composite:Ai},number:{source:mi,composite:wi}},i=function(t){return {"line-pattern":{source:si,composite:si},"fill-pattern":{source:si,composite:si},"fill-extrusion-pattern":{source:si,composite:si}}[t]}(t);return i&&i[r]||n[e][r]}na.prototype.populatePaintArrays=function(t,e,r,n,i){for(var a in this.programConfigurations)this.programConfigurations[a].populatePaintArrays(t,e,r,n,i);this.needsUpload=!0;},na.prototype.updatePaintArrays=function(t,e,r,n){for(var i=0,a=r;i<a.length;i+=1){var o=a[i];this.needsUpload=this.programConfigurations[o.id].updatePaintArrays(t,e,o,n)||this.needsUpload;}},na.prototype.get=function(t){return this.programConfigurations[t]},na.prototype.upload=function(t){if(this.needsUpload){for(var e in this.programConfigurations)this.programConfigurations[e].upload(t);this.needsUpload=!1;}},na.prototype.destroy=function(){for(var t in this.programConfigurations)this.programConfigurations[t].destroy();},xn("ConstantBinder",$i),xn("CrossFadedConstantBinder",Wi),xn("SourceExpressionBinder",Qi),xn("CrossFadedCompositeBinder",ea),xn("CompositeExpressionBinder",ta),xn("ProgramConfiguration",ra,{omit:["_buffers"]}),xn("ProgramConfigurationSet",na);var oa=8192;var sa,ua=(sa=15,{min:-1*Math.pow(2,sa-1),max:Math.pow(2,sa-1)-1});function la(t){for(var e=oa/t.extent,r=t.loadGeometry(),n=0;n<r.length;n++)for(var i=r[n],a=0;a<i.length;a++){var o=i[a];o.x=Math.round(o.x*e),o.y=Math.round(o.y*e),(o.x<ua.min||o.x>ua.max||o.y<ua.min||o.y>ua.max)&&(w("Geometry exceeds allowed extent, reduce your vector tile buffer size"),o.x=l(o.x,ua.min,ua.max),o.y=l(o.y,ua.min,ua.max));}return r}function pa(t,e,r,n,i){t.emplaceBack(2*e+(n+1)/2,2*r+(i+1)/2);}var ca=function(t){this.zoom=t.zoom,this.overscaling=t.overscaling,this.layers=t.layers,this.layerIds=this.layers.map((function(t){return t.id})),this.index=t.index,this.hasPattern=!1,this.layoutVertexArray=new ni,this.indexArray=new xi,this.segments=new Li,this.programConfigurations=new na(Oi,t.layers,t.zoom),this.stateDependentLayerIds=this.layers.filter((function(t){return t.isStateDependent()})).map((function(t){return t.id}));};function ha(t,e){for(var r=0;r<t.length;r++)if(_a(e,t[r]))return !0;for(var n=0;n<e.length;n++)if(_a(t,e[n]))return !0;return !!ma(t,e)}function fa(t,e,r){return !!_a(t,e)||!!ga(e,t,r)}function ya(t,e){if(1===t.length)return ba(e,t[0]);for(var r=0;r<e.length;r++)for(var n=e[r],i=0;i<n.length;i++)if(_a(t,n[i]))return !0;for(var a=0;a<t.length;a++)if(ba(e,t[a]))return !0;for(var o=0;o<e.length;o++)if(ma(t,e[o]))return !0;return !1}function da(t,e,r){if(t.length>1){if(ma(t,e))return !0;for(var n=0;n<e.length;n++)if(ga(e[n],t,r))return !0}for(var i=0;i<t.length;i++)if(ga(t[i],e,r))return !0;return !1}function ma(t,e){if(0===t.length||0===e.length)return !1;for(var r=0;r<t.length-1;r++)for(var n=t[r],i=t[r+1],a=0;a<e.length-1;a++){if(va(n,i,e[a],e[a+1]))return !0}return !1}function va(t,e,r,n){return A(t,r,n)!==A(e,r,n)&&A(t,e,r)!==A(t,e,n)}function ga(t,e,r){var n=r*r;if(1===e.length)return t.distSqr(e[0])<n;for(var i=1;i<e.length;i++){if(xa(t,e[i-1],e[i])<n)return !0}return !1}function xa(t,e,r){var n=e.distSqr(r);if(0===n)return t.distSqr(e);var i=((t.x-e.x)*(r.x-e.x)+(t.y-e.y)*(r.y-e.y))/n;return i<0?t.distSqr(e):i>1?t.distSqr(r):t.distSqr(r.sub(e)._mult(i)._add(e))}function ba(t,e){for(var r,n,i,a=!1,o=0;o<t.length;o++)for(var s=0,u=(r=t[o]).length-1;s<r.length;u=s++)n=r[s],i=r[u],n.y>e.y!=i.y>e.y&&e.x<(i.x-n.x)*(e.y-n.y)/(i.y-n.y)+n.x&&(a=!a);return a}function _a(t,e){for(var r=!1,n=0,i=t.length-1;n<t.length;i=n++){var a=t[n],o=t[i];a.y>e.y!=o.y>e.y&&e.x<(o.x-a.x)*(e.y-a.y)/(o.y-a.y)+a.x&&(r=!r);}return r}function wa(t,e,r){var n=r[0],i=r[2];if(t.x<n.x&&e.x<n.x||t.x>i.x&&e.x>i.x||t.y<n.y&&e.y<n.y||t.y>i.y&&e.y>i.y)return !1;var a=A(t,e,r[0]);return a!==A(t,e,r[1])||a!==A(t,e,r[2])||a!==A(t,e,r[3])}function Aa(t,e,r){var n=e.paint.get(t).value;return "constant"===n.kind?n.value:r.programConfigurations.get(e.id).binders[t].maxValue}function ka(t){return Math.sqrt(t[0]*t[0]+t[1]*t[1])}function Sa(t,e,r,n,a){if(!e[0]&&!e[1])return t;var o=i.convert(e)._mult(a);"viewport"===r&&o._rotate(-n);for(var s=[],u=0;u<t.length;u++){var l=t[u];s.push(l.sub(o));}return s}ca.prototype.populate=function(t,e){var r=this.layers[0],n=[],i=null;"circle"===r.type&&(i=r.layout.get("circle-sort-key"));for(var a=0,o=t;a<o.length;a+=1){var s=o[a],u=s.feature,l=s.index,p=s.sourceLayerIndex;if(this.layers[0]._featureFilter(new On(this.zoom),u)){var c=la(u),h=i?i.evaluate(u,{}):void 0,f={id:u.id,properties:u.properties,type:u.type,sourceLayerIndex:p,index:l,geometry:c,patterns:{},sortKey:h};n.push(f);}}i&&n.sort((function(t,e){return t.sortKey-e.sortKey}));for(var y=0,d=n;y<d.length;y+=1){var m=d[y],v=m,g=v.geometry,x=v.index,b=v.sourceLayerIndex,_=t[x].feature;this.addFeature(m,g,x),e.featureIndex.insert(_,g,x,b,this.index);}},ca.prototype.update=function(t,e,r){this.stateDependentLayers.length&&this.programConfigurations.updatePaintArrays(t,e,this.stateDependentLayers,r);},ca.prototype.isEmpty=function(){return 0===this.layoutVertexArray.length},ca.prototype.uploadPending=function(){return !this.uploaded||this.programConfigurations.needsUpload},ca.prototype.upload=function(t){this.uploaded||(this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,Oi),this.indexBuffer=t.createIndexBuffer(this.indexArray)),this.programConfigurations.upload(t),this.uploaded=!0;},ca.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.programConfigurations.destroy(),this.segments.destroy());},ca.prototype.addFeature=function(t,e,r){for(var n=0,i=e;n<i.length;n+=1)for(var a=0,o=i[n];a<o.length;a+=1){var s=o[a],u=s.x,l=s.y;if(!(u<0||u>=oa||l<0||l>=oa)){var p=this.segments.prepareSegment(4,this.layoutVertexArray,this.indexArray,t.sortKey),c=p.vertexLength;pa(this.layoutVertexArray,u,l,-1,-1),pa(this.layoutVertexArray,u,l,1,-1),pa(this.layoutVertexArray,u,l,1,1),pa(this.layoutVertexArray,u,l,-1,1),this.indexArray.emplaceBack(c,c+1,c+2),this.indexArray.emplaceBack(c,c+3,c+2),p.vertexLength+=4,p.primitiveLength+=2;}}this.programConfigurations.populatePaintArrays(this.layoutVertexArray.length,t,r,{});},xn("CircleBucket",ca,{omit:["layers"]});var za=new Yn({"circle-sort-key":new Xn(zt.layout_circle["circle-sort-key"])}),Ia={paint:new Yn({"circle-radius":new Xn(zt.paint_circle["circle-radius"]),"circle-color":new Xn(zt.paint_circle["circle-color"]),"circle-blur":new Xn(zt.paint_circle["circle-blur"]),"circle-opacity":new Xn(zt.paint_circle["circle-opacity"]),"circle-translate":new Zn(zt.paint_circle["circle-translate"]),"circle-translate-anchor":new Zn(zt.paint_circle["circle-translate-anchor"]),"circle-pitch-scale":new Zn(zt.paint_circle["circle-pitch-scale"]),"circle-pitch-alignment":new Zn(zt.paint_circle["circle-pitch-alignment"]),"circle-stroke-width":new Xn(zt.paint_circle["circle-stroke-width"]),"circle-stroke-color":new Xn(zt.paint_circle["circle-stroke-color"]),"circle-stroke-opacity":new Xn(zt.paint_circle["circle-stroke-opacity"])}),layout:za},Ca="undefined"!=typeof Float32Array?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var t=arguments,e=0,r=arguments.length;r--;)e+=t[r]*t[r];return Math.sqrt(e)});var Ba,Ea;Ba=new Ca(3),Ca!=Float32Array&&(Ba[0]=0,Ba[1]=0,Ba[2]=0),Ea=Ba;function Ma(t,e,r){var n=e[0],i=e[1],a=e[2],o=e[3];return t[0]=r[0]*n+r[4]*i+r[8]*a+r[12]*o,t[1]=r[1]*n+r[5]*i+r[9]*a+r[13]*o,t[2]=r[2]*n+r[6]*i+r[10]*a+r[14]*o,t[3]=r[3]*n+r[7]*i+r[11]*a+r[15]*o,t}!function(){var t=function(){var t=new Ca(4);return Ca!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t}();}();var Pa=function(t){function e(e){t.call(this,e,Ia);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.createBucket=function(t){return new ca(t)},e.prototype.queryRadius=function(t){var e=t;return Aa("circle-radius",this,e)+Aa("circle-stroke-width",this,e)+ka(this.paint.get("circle-translate"))},e.prototype.queryIntersectsFeature=function(t,e,r,n,i,a,o,s){for(var u=Sa(t,this.paint.get("circle-translate"),this.paint.get("circle-translate-anchor"),a.angle,o),l=this.paint.get("circle-radius").evaluate(e,r)+this.paint.get("circle-stroke-width").evaluate(e,r),p="map"===this.paint.get("circle-pitch-alignment"),c=p?u:function(t,e){return t.map((function(t){return Ta(t,e)}))}(u,s),h=p?l*o:l,f=0,y=n;f<y.length;f+=1)for(var d=0,m=y[f];d<m.length;d+=1){var v=m[d],g=p?v:Ta(v,s),x=h,b=Ma([],[v.x,v.y,0,1],s);if("viewport"===this.paint.get("circle-pitch-scale")&&"map"===this.paint.get("circle-pitch-alignment")?x*=b[3]/a.cameraToCenterDistance:"map"===this.paint.get("circle-pitch-scale")&&"viewport"===this.paint.get("circle-pitch-alignment")&&(x*=a.cameraToCenterDistance/b[3]),fa(c,g,x))return !0}return !1},e}($n);function Ta(t,e){var r=Ma([],[t.x,t.y,0,1],e);return new i(r[0]/r[3],r[1]/r[3])}var Va=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e}(ca);function Fa(t,e,r,n){var i=e.width,a=e.height;if(n){if(n instanceof Uint8ClampedArray)n=new Uint8Array(n.buffer);else if(n.length!==i*a*r)throw new RangeError("mismatched image size")}else n=new Uint8Array(i*a*r);return t.width=i,t.height=a,t.data=n,t}function Oa(t,e,r){var n=e.width,i=e.height;if(n!==t.width||i!==t.height){var a=Fa({},{width:n,height:i},r);La(t,a,{x:0,y:0},{x:0,y:0},{width:Math.min(t.width,n),height:Math.min(t.height,i)},r),t.width=n,t.height=i,t.data=a.data;}}function La(t,e,r,n,i,a){if(0===i.width||0===i.height)return e;if(i.width>t.width||i.height>t.height||r.x>t.width-i.width||r.y>t.height-i.height)throw new RangeError("out of range source coordinates for image copy");if(i.width>e.width||i.height>e.height||n.x>e.width-i.width||n.y>e.height-i.height)throw new RangeError("out of range destination coordinates for image copy");for(var o=t.data,s=e.data,u=0;u<i.height;u++)for(var l=((r.y+u)*t.width+r.x)*a,p=((n.y+u)*e.width+n.x)*a,c=0;c<i.width*a;c++)s[p+c]=o[l+c];return e}xn("HeatmapBucket",Va,{omit:["layers"]});var Da=function(t,e){Fa(this,t,1,e);};Da.prototype.resize=function(t){Oa(this,t,1);},Da.prototype.clone=function(){return new Da({width:this.width,height:this.height},new Uint8Array(this.data))},Da.copy=function(t,e,r,n,i){La(t,e,r,n,i,1);};var Ua=function(t,e){Fa(this,t,4,e);};Ua.prototype.resize=function(t){Oa(this,t,4);},Ua.prototype.replace=function(t,e){e?this.data.set(t):t instanceof Uint8ClampedArray?this.data=new Uint8Array(t.buffer):this.data=t;},Ua.prototype.clone=function(){return new Ua({width:this.width,height:this.height},new Uint8Array(this.data))},Ua.copy=function(t,e,r,n,i){La(t,e,r,n,i,4);},xn("AlphaImage",Da),xn("RGBAImage",Ua);var Ra={paint:new Yn({"heatmap-radius":new Xn(zt.paint_heatmap["heatmap-radius"]),"heatmap-weight":new Xn(zt.paint_heatmap["heatmap-weight"]),"heatmap-intensity":new Zn(zt.paint_heatmap["heatmap-intensity"]),"heatmap-color":new Hn(zt.paint_heatmap["heatmap-color"]),"heatmap-opacity":new Zn(zt.paint_heatmap["heatmap-opacity"])})};function ja(t,e){for(var r=new Uint8Array(1024),n={},i=0,a=0;i<256;i++,a+=4){n[e]=i/255;var o=t.evaluate(n);r[a+0]=Math.floor(255*o.r/o.a),r[a+1]=Math.floor(255*o.g/o.a),r[a+2]=Math.floor(255*o.b/o.a),r[a+3]=Math.floor(255*o.a);}return new Ua({width:256,height:1},r)}var qa=function(t){function e(e){t.call(this,e,Ra),this._updateColorRamp();}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.createBucket=function(t){return new Va(t)},e.prototype._handleSpecialPaintPropertyUpdate=function(t){"heatmap-color"===t&&this._updateColorRamp();},e.prototype._updateColorRamp=function(){var t=this._transitionablePaint._values["heatmap-color"].value.expression;this.colorRamp=ja(t,"heatmapDensity"),this.colorRampTexture=null;},e.prototype.resize=function(){this.heatmapFbo&&(this.heatmapFbo.destroy(),this.heatmapFbo=null);},e.prototype.queryRadius=function(){return 0},e.prototype.queryIntersectsFeature=function(){return !1},e.prototype.hasOffscreenPass=function(){return 0!==this.paint.get("heatmap-opacity")&&"none"!==this.visibility},e}($n),Na={paint:new Yn({"hillshade-illumination-direction":new Zn(zt.paint_hillshade["hillshade-illumination-direction"]),"hillshade-illumination-anchor":new Zn(zt.paint_hillshade["hillshade-illumination-anchor"]),"hillshade-exaggeration":new Zn(zt.paint_hillshade["hillshade-exaggeration"]),"hillshade-shadow-color":new Zn(zt.paint_hillshade["hillshade-shadow-color"]),"hillshade-highlight-color":new Zn(zt.paint_hillshade["hillshade-highlight-color"]),"hillshade-accent-color":new Zn(zt.paint_hillshade["hillshade-accent-color"])})},Ka=function(t){function e(e){t.call(this,e,Na);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.hasOffscreenPass=function(){return 0!==this.paint.get("hillshade-exaggeration")&&"none"!==this.visibility},e}($n),Za=ei([{name:"a_pos",components:2,type:"Int16"}],4).members,Xa=Ja,Ga=Ja;function Ja(t,e,r){r=r||2;var n,i,a,o,s,u,l,p=e&&e.length,c=p?e[0]*r:t.length,h=Ha(t,0,c,r,!0),f=[];if(!h||h.next===h.prev)return f;if(p&&(h=function(t,e,r,n){var i,a,o,s,u,l=[];for(i=0,a=e.length;i<a;i++)o=e[i]*n,s=i<a-1?e[i+1]*n:t.length,(u=Ha(t,o,s,n,!1))===u.next&&(u.steiner=!0),l.push(oo(u));for(l.sort(ro),i=0;i<l.length;i++)no(l[i],r),r=Ya(r,r.next);return r}(t,e,h,r)),t.length>80*r){n=a=t[0],i=o=t[1];for(var y=r;y<c;y+=r)(s=t[y])<n&&(n=s),(u=t[y+1])<i&&(i=u),s>a&&(a=s),u>o&&(o=u);l=0!==(l=Math.max(a-n,o-i))?1/l:0;}return $a(h,f,r,n,i,l),f}function Ha(t,e,r,n,i){var a,o;if(i===bo(t,e,r,n)>0)for(a=e;a<r;a+=n)o=vo(a,t[a],t[a+1],o);else for(a=r-n;a>=e;a-=n)o=vo(a,t[a],t[a+1],o);return o&&po(o,o.next)&&(go(o),o=o.next),o}function Ya(t,e){if(!t)return t;e||(e=t);var r,n=t;do{if(r=!1,n.steiner||!po(n,n.next)&&0!==lo(n.prev,n,n.next))n=n.next;else{if(go(n),(n=e=n.prev)===n.next)break;r=!0;}}while(r||n!==e);return e}function $a(t,e,r,n,i,a,o){if(t){!o&&a&&function(t,e,r,n){var i=t;do{null===i.z&&(i.z=ao(i.x,i.y,e,r,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;}while(i!==t);i.prevZ.nextZ=null,i.prevZ=null,function(t){var e,r,n,i,a,o,s,u,l=1;do{for(r=t,t=null,a=null,o=0;r;){for(o++,n=r,s=0,e=0;e<l&&(s++,n=n.nextZ);e++);for(u=l;s>0||u>0&&n;)0!==s&&(0===u||!n||r.z<=n.z)?(i=r,r=r.nextZ,s--):(i=n,n=n.nextZ,u--),a?a.nextZ=i:t=i,i.prevZ=a,a=i;r=n;}a.nextZ=null,l*=2;}while(o>1)}(i);}(t,n,i,a);for(var s,u,l=t;t.prev!==t.next;)if(s=t.prev,u=t.next,a?Qa(t,n,i,a):Wa(t))e.push(s.i/r),e.push(t.i/r),e.push(u.i/r),go(t),t=u.next,l=u.next;else if((t=u)===l){o?1===o?$a(t=to(Ya(t),e,r),e,r,n,i,a,2):2===o&&eo(t,e,r,n,i,a):$a(Ya(t),e,r,n,i,a,1);break}}}function Wa(t){var e=t.prev,r=t,n=t.next;if(lo(e,r,n)>=0)return !1;for(var i=t.next.next;i!==t.prev;){if(so(e.x,e.y,r.x,r.y,n.x,n.y,i.x,i.y)&&lo(i.prev,i,i.next)>=0)return !1;i=i.next;}return !0}function Qa(t,e,r,n){var i=t.prev,a=t,o=t.next;if(lo(i,a,o)>=0)return !1;for(var s=i.x<a.x?i.x<o.x?i.x:o.x:a.x<o.x?a.x:o.x,u=i.y<a.y?i.y<o.y?i.y:o.y:a.y<o.y?a.y:o.y,l=i.x>a.x?i.x>o.x?i.x:o.x:a.x>o.x?a.x:o.x,p=i.y>a.y?i.y>o.y?i.y:o.y:a.y>o.y?a.y:o.y,c=ao(s,u,e,r,n),h=ao(l,p,e,r,n),f=t.prevZ,y=t.nextZ;f&&f.z>=c&&y&&y.z<=h;){if(f!==t.prev&&f!==t.next&&so(i.x,i.y,a.x,a.y,o.x,o.y,f.x,f.y)&&lo(f.prev,f,f.next)>=0)return !1;if(f=f.prevZ,y!==t.prev&&y!==t.next&&so(i.x,i.y,a.x,a.y,o.x,o.y,y.x,y.y)&&lo(y.prev,y,y.next)>=0)return !1;y=y.nextZ;}for(;f&&f.z>=c;){if(f!==t.prev&&f!==t.next&&so(i.x,i.y,a.x,a.y,o.x,o.y,f.x,f.y)&&lo(f.prev,f,f.next)>=0)return !1;f=f.prevZ;}for(;y&&y.z<=h;){if(y!==t.prev&&y!==t.next&&so(i.x,i.y,a.x,a.y,o.x,o.y,y.x,y.y)&&lo(y.prev,y,y.next)>=0)return !1;y=y.nextZ;}return !0}function to(t,e,r){var n=t;do{var i=n.prev,a=n.next.next;!po(i,a)&&co(i,n,n.next,a)&&yo(i,a)&&yo(a,i)&&(e.push(i.i/r),e.push(n.i/r),e.push(a.i/r),go(n),go(n.next),n=t=a),n=n.next;}while(n!==t);return Ya(n)}function eo(t,e,r,n,i,a){var o=t;do{for(var s=o.next.next;s!==o.prev;){if(o.i!==s.i&&uo(o,s)){var u=mo(o,s);return o=Ya(o,o.next),u=Ya(u,u.next),$a(o,e,r,n,i,a),void $a(u,e,r,n,i,a)}s=s.next;}o=o.next;}while(o!==t)}function ro(t,e){return t.x-e.x}function no(t,e){if(e=function(t,e){var r,n=e,i=t.x,a=t.y,o=-1/0;do{if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){var s=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(s<=i&&s>o){if(o=s,s===i){if(a===n.y)return n;if(a===n.next.y)return n.next}r=n.x<n.next.x?n:n.next;}}n=n.next;}while(n!==e);if(!r)return null;if(i===o)return r;var u,l=r,p=r.x,c=r.y,h=1/0;n=r;do{i>=n.x&&n.x>=p&&i!==n.x&&so(a<c?i:o,a,p,c,a<c?o:i,a,n.x,n.y)&&(u=Math.abs(a-n.y)/(i-n.x),yo(n,t)&&(u<h||u===h&&(n.x>r.x||n.x===r.x&&io(r,n)))&&(r=n,h=u)),n=n.next;}while(n!==l);return r}(t,e)){var r=mo(e,t);Ya(r,r.next);}}function io(t,e){return lo(t.prev,t,e.prev)<0&&lo(e.next,t,t.next)<0}function ao(t,e,r,n,i){return (t=1431655765&((t=858993459&((t=252645135&((t=16711935&((t=32767*(t-r)*i)|t<<8))|t<<4))|t<<2))|t<<1))|(e=1431655765&((e=858993459&((e=252645135&((e=16711935&((e=32767*(e-n)*i)|e<<8))|e<<4))|e<<2))|e<<1))<<1}function oo(t){var e=t,r=t;do{(e.x<r.x||e.x===r.x&&e.y<r.y)&&(r=e),e=e.next;}while(e!==t);return r}function so(t,e,r,n,i,a,o,s){return (i-o)*(e-s)-(t-o)*(a-s)>=0&&(t-o)*(n-s)-(r-o)*(e-s)>=0&&(r-o)*(a-s)-(i-o)*(n-s)>=0}function uo(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!function(t,e){var r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==e.i&&r.next.i!==e.i&&co(r,r.next,t,e))return !0;r=r.next;}while(r!==t);return !1}(t,e)&&(yo(t,e)&&yo(e,t)&&function(t,e){var r=t,n=!1,i=(t.x+e.x)/2,a=(t.y+e.y)/2;do{r.y>a!=r.next.y>a&&r.next.y!==r.y&&i<(r.next.x-r.x)*(a-r.y)/(r.next.y-r.y)+r.x&&(n=!n),r=r.next;}while(r!==t);return n}(t,e)&&(lo(t.prev,t,e.prev)||lo(t,e.prev,e))||po(t,e)&&lo(t.prev,t,t.next)>0&&lo(e.prev,e,e.next)>0)}function lo(t,e,r){return (e.y-t.y)*(r.x-e.x)-(e.x-t.x)*(r.y-e.y)}function po(t,e){return t.x===e.x&&t.y===e.y}function co(t,e,r,n){var i=fo(lo(t,e,r)),a=fo(lo(t,e,n)),o=fo(lo(r,n,t)),s=fo(lo(r,n,e));return i!==a&&o!==s||(!(0!==i||!ho(t,r,e))||(!(0!==a||!ho(t,n,e))||(!(0!==o||!ho(r,t,n))||!(0!==s||!ho(r,e,n)))))}function ho(t,e,r){return e.x<=Math.max(t.x,r.x)&&e.x>=Math.min(t.x,r.x)&&e.y<=Math.max(t.y,r.y)&&e.y>=Math.min(t.y,r.y)}function fo(t){return t>0?1:t<0?-1:0}function yo(t,e){return lo(t.prev,t,t.next)<0?lo(t,e,t.next)>=0&&lo(t,t.prev,e)>=0:lo(t,e,t.prev)<0||lo(t,t.next,e)<0}function mo(t,e){var r=new xo(t.i,t.x,t.y),n=new xo(e.i,e.x,e.y),i=t.next,a=e.prev;return t.next=e,e.prev=t,r.next=i,i.prev=r,n.next=r,r.prev=n,a.next=n,n.prev=a,n}function vo(t,e,r,n){var i=new xo(t,e,r);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function go(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ);}function xo(t,e,r){this.i=t,this.x=e,this.y=r,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1;}function bo(t,e,r,n){for(var i=0,a=e,o=r-n;a<r;a+=n)i+=(t[o]-t[a])*(t[a+1]+t[o+1]),o=a;return i}function _o(t,e,r,n,i){!function t(e,r,n,i,a){for(;i>n;){if(i-n>600){var o=i-n+1,s=r-n+1,u=Math.log(o),l=.5*Math.exp(2*u/3),p=.5*Math.sqrt(u*l*(o-l)/o)*(s-o/2<0?-1:1),c=Math.max(n,Math.floor(r-s*l/o+p)),h=Math.min(i,Math.floor(r+(o-s)*l/o+p));t(e,r,c,h,a);}var f=e[r],y=n,d=i;for(wo(e,n,r),a(e[i],f)>0&&wo(e,n,i);y<d;){for(wo(e,y,d),y++,d--;a(e[y],f)<0;)y++;for(;a(e[d],f)>0;)d--;}0===a(e[n],f)?wo(e,n,d):wo(e,++d,i),d<=r&&(n=d+1),r<=d&&(i=d-1);}}(t,e,r||0,n||t.length-1,i||Ao);}function wo(t,e,r){var n=t[e];t[e]=t[r],t[r]=n;}function Ao(t,e){return t<e?-1:t>e?1:0}function ko(t,e){var r=t.length;if(r<=1)return [t];for(var n,i,a=[],o=0;o<r;o++){var s=k(t[o]);0!==s&&(t[o].area=Math.abs(s),void 0===i&&(i=s<0),i===s<0?(n&&a.push(n),n=[t[o]]):n.push(t[o]));}if(n&&a.push(n),e>1)for(var u=0;u<a.length;u++)a[u].length<=e||(_o(a[u],e,1,a[u].length-1,So),a[u]=a[u].slice(0,e));return a}function So(t,e){return e.area-t.area}function zo(t,e,r){for(var n=r.patternDependencies,i=!1,a=0,o=e;a<o.length;a+=1){var s=o[a].paint.get(t+"-pattern");s.isConstant()||(i=!0);var u=s.constantOr(null);u&&(i=!0,n[u.to]=!0,n[u.from]=!0);}return i}function Io(t,e,r,n,i){for(var a=i.patternDependencies,o=0,s=e;o<s.length;o+=1){var u=s[o],l=u.paint.get(t+"-pattern").value;if("constant"!==l.kind){var p=l.evaluate({zoom:n-1},r,{},i.availableImages),c=l.evaluate({zoom:n},r,{},i.availableImages),h=l.evaluate({zoom:n+1},r,{},i.availableImages);p=p&&p.name?p.name:p,c=c&&c.name?c.name:c,h=h&&h.name?h.name:h,a[p]=!0,a[c]=!0,a[h]=!0,r.patterns[u.id]={min:p,mid:c,max:h};}}return r}Ja.deviation=function(t,e,r,n){var i=e&&e.length,a=i?e[0]*r:t.length,o=Math.abs(bo(t,0,a,r));if(i)for(var s=0,u=e.length;s<u;s++){var l=e[s]*r,p=s<u-1?e[s+1]*r:t.length;o-=Math.abs(bo(t,l,p,r));}var c=0;for(s=0;s<n.length;s+=3){var h=n[s]*r,f=n[s+1]*r,y=n[s+2]*r;c+=Math.abs((t[h]-t[y])*(t[f+1]-t[h+1])-(t[h]-t[f])*(t[y+1]-t[h+1]));}return 0===o&&0===c?0:Math.abs((c-o)/o)},Ja.flatten=function(t){for(var e=t[0][0].length,r={vertices:[],holes:[],dimensions:e},n=0,i=0;i<t.length;i++){for(var a=0;a<t[i].length;a++)for(var o=0;o<e;o++)r.vertices.push(t[i][a][o]);i>0&&(n+=t[i-1].length,r.holes.push(n));}return r},Xa.default=Ga;var Co=function(t){this.zoom=t.zoom,this.overscaling=t.overscaling,this.layers=t.layers,this.layerIds=this.layers.map((function(t){return t.id})),this.index=t.index,this.hasPattern=!1,this.patternFeatures=[],this.layoutVertexArray=new ni,this.indexArray=new xi,this.indexArray2=new bi,this.programConfigurations=new na(Za,t.layers,t.zoom),this.segments=new Li,this.segments2=new Li,this.stateDependentLayerIds=this.layers.filter((function(t){return t.isStateDependent()})).map((function(t){return t.id}));};Co.prototype.populate=function(t,e){this.hasPattern=zo("fill",this.layers,e);for(var r=this.layers[0].layout.get("fill-sort-key"),n=[],i=0,a=t;i<a.length;i+=1){var o=a[i],s=o.feature,u=o.index,l=o.sourceLayerIndex;if(this.layers[0]._featureFilter(new On(this.zoom),s)){var p=la(s),c=r?r.evaluate(s,{},e.availableImages):void 0,h={id:s.id,properties:s.properties,type:s.type,sourceLayerIndex:l,index:u,geometry:p,patterns:{},sortKey:c};n.push(h);}}r&&n.sort((function(t,e){return t.sortKey-e.sortKey}));for(var f=0,y=n;f<y.length;f+=1){var d=y[f],m=d,v=m.geometry,g=m.index,x=m.sourceLayerIndex;if(this.hasPattern){var b=Io("fill",this.layers,d,this.zoom,e);this.patternFeatures.push(b);}else this.addFeature(d,v,g,{});var _=t[g].feature;e.featureIndex.insert(_,v,g,x,this.index);}},Co.prototype.update=function(t,e,r){this.stateDependentLayers.length&&this.programConfigurations.updatePaintArrays(t,e,this.stateDependentLayers,r);},Co.prototype.addFeatures=function(t,e){for(var r=0,n=this.patternFeatures;r<n.length;r+=1){var i=n[r];this.addFeature(i,i.geometry,i.index,e);}},Co.prototype.isEmpty=function(){return 0===this.layoutVertexArray.length},Co.prototype.uploadPending=function(){return !this.uploaded||this.programConfigurations.needsUpload},Co.prototype.upload=function(t){this.uploaded||(this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,Za),this.indexBuffer=t.createIndexBuffer(this.indexArray),this.indexBuffer2=t.createIndexBuffer(this.indexArray2)),this.programConfigurations.upload(t),this.uploaded=!0;},Co.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.indexBuffer2.destroy(),this.programConfigurations.destroy(),this.segments.destroy(),this.segments2.destroy());},Co.prototype.addFeature=function(t,e,r,n){for(var i=0,a=ko(e,500);i<a.length;i+=1){for(var o=a[i],s=0,u=0,l=o;u<l.length;u+=1){s+=l[u].length;}for(var p=this.segments.prepareSegment(s,this.layoutVertexArray,this.indexArray),c=p.vertexLength,h=[],f=[],y=0,d=o;y<d.length;y+=1){var m=d[y];if(0!==m.length){m!==o[0]&&f.push(h.length/2);var v=this.segments2.prepareSegment(m.length,this.layoutVertexArray,this.indexArray2),g=v.vertexLength;this.layoutVertexArray.emplaceBack(m[0].x,m[0].y),this.indexArray2.emplaceBack(g+m.length-1,g),h.push(m[0].x),h.push(m[0].y);for(var x=1;x<m.length;x++)this.layoutVertexArray.emplaceBack(m[x].x,m[x].y),this.indexArray2.emplaceBack(g+x-1,g+x),h.push(m[x].x),h.push(m[x].y);v.vertexLength+=m.length,v.primitiveLength+=m.length;}}for(var b=Xa(h,f),_=0;_<b.length;_+=3)this.indexArray.emplaceBack(c+b[_],c+b[_+1],c+b[_+2]);p.vertexLength+=s,p.primitiveLength+=b.length/3;}this.programConfigurations.populatePaintArrays(this.layoutVertexArray.length,t,r,n);},xn("FillBucket",Co,{omit:["layers","patternFeatures"]});var Bo=new Yn({"fill-sort-key":new Xn(zt.layout_fill["fill-sort-key"])}),Eo={paint:new Yn({"fill-antialias":new Zn(zt.paint_fill["fill-antialias"]),"fill-opacity":new Xn(zt.paint_fill["fill-opacity"]),"fill-color":new Xn(zt.paint_fill["fill-color"]),"fill-outline-color":new Xn(zt.paint_fill["fill-outline-color"]),"fill-translate":new Zn(zt.paint_fill["fill-translate"]),"fill-translate-anchor":new Zn(zt.paint_fill["fill-translate-anchor"]),"fill-pattern":new Gn(zt.paint_fill["fill-pattern"])}),layout:Bo},Mo=function(t){function e(e){t.call(this,e,Eo);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.recalculate=function(e,r){t.prototype.recalculate.call(this,e,r);var n=this.paint._values["fill-outline-color"];"constant"===n.value.kind&&void 0===n.value.value&&(this.paint._values["fill-outline-color"]=this.paint._values["fill-color"]);},e.prototype.createBucket=function(t){return new Co(t)},e.prototype.queryRadius=function(){return ka(this.paint.get("fill-translate"))},e.prototype.queryIntersectsFeature=function(t,e,r,n,i,a,o){return ya(Sa(t,this.paint.get("fill-translate"),this.paint.get("fill-translate-anchor"),a.angle,o),n)},e.prototype.isTileClipped=function(){return !0},e}($n),Po=ei([{name:"a_pos",components:2,type:"Int16"},{name:"a_normal_ed",components:4,type:"Int16"}],4).members,To=Vo;function Vo(t,e,r,n,i){this.properties={},this.extent=r,this.type=0,this._pbf=t,this._geometry=-1,this._keys=n,this._values=i,t.readFields(Fo,this,e);}function Fo(t,e,r){1==t?e.id=r.readVarint():2==t?function(t,e){var r=t.readVarint()+t.pos;for(;t.pos<r;){var n=e._keys[t.readVarint()],i=e._values[t.readVarint()];e.properties[n]=i;}}(r,e):3==t?e.type=r.readVarint():4==t&&(e._geometry=r.pos);}function Oo(t){for(var e,r,n=0,i=0,a=t.length,o=a-1;i<a;o=i++)e=t[i],n+=((r=t[o]).x-e.x)*(e.y+r.y);return n}Vo.types=["Unknown","Point","LineString","Polygon"],Vo.prototype.loadGeometry=function(){var t=this._pbf;t.pos=this._geometry;for(var e,r=t.readVarint()+t.pos,n=1,a=0,o=0,s=0,u=[];t.pos<r;){if(a<=0){var l=t.readVarint();n=7&l,a=l>>3;}if(a--,1===n||2===n)o+=t.readSVarint(),s+=t.readSVarint(),1===n&&(e&&u.push(e),e=[]),e.push(new i(o,s));else{if(7!==n)throw new Error("unknown command "+n);e&&e.push(e[0].clone());}}return e&&u.push(e),u},Vo.prototype.bbox=function(){var t=this._pbf;t.pos=this._geometry;for(var e=t.readVarint()+t.pos,r=1,n=0,i=0,a=0,o=1/0,s=-1/0,u=1/0,l=-1/0;t.pos<e;){if(n<=0){var p=t.readVarint();r=7&p,n=p>>3;}if(n--,1===r||2===r)(i+=t.readSVarint())<o&&(o=i),i>s&&(s=i),(a+=t.readSVarint())<u&&(u=a),a>l&&(l=a);else if(7!==r)throw new Error("unknown command "+r)}return [o,u,s,l]},Vo.prototype.toGeoJSON=function(t,e,r){var n,i,a=this.extent*Math.pow(2,r),o=this.extent*t,s=this.extent*e,u=this.loadGeometry(),l=Vo.types[this.type];function p(t){for(var e=0;e<t.length;e++){var r=t[e],n=180-360*(r.y+s)/a;t[e]=[360*(r.x+o)/a-180,360/Math.PI*Math.atan(Math.exp(n*Math.PI/180))-90];}}switch(this.type){case 1:var c=[];for(n=0;n<u.length;n++)c[n]=u[n][0];p(u=c);break;case 2:for(n=0;n<u.length;n++)p(u[n]);break;case 3:for(u=function(t){var e=t.length;if(e<=1)return [t];for(var r,n,i=[],a=0;a<e;a++){var o=Oo(t[a]);0!==o&&(void 0===n&&(n=o<0),n===o<0?(r&&i.push(r),r=[t[a]]):r.push(t[a]));}r&&i.push(r);return i}(u),n=0;n<u.length;n++)for(i=0;i<u[n].length;i++)p(u[n][i]);}1===u.length?u=u[0]:l="Multi"+l;var h={type:"Feature",geometry:{type:l,coordinates:u},properties:this.properties};return "id"in this&&(h.id=this.id),h};var Lo=Do;function Do(t,e){this.version=1,this.name=null,this.extent=4096,this.length=0,this._pbf=t,this._keys=[],this._values=[],this._features=[],t.readFields(Uo,this,e),this.length=this._features.length;}function Uo(t,e,r){15===t?e.version=r.readVarint():1===t?e.name=r.readString():5===t?e.extent=r.readVarint():2===t?e._features.push(r.pos):3===t?e._keys.push(r.readString()):4===t&&e._values.push(function(t){var e=null,r=t.readVarint()+t.pos;for(;t.pos<r;){var n=t.readVarint()>>3;e=1===n?t.readString():2===n?t.readFloat():3===n?t.readDouble():4===n?t.readVarint64():5===n?t.readVarint():6===n?t.readSVarint():7===n?t.readBoolean():null;}return e}(r));}function Ro(t,e,r){if(3===t){var n=new Lo(r,r.readVarint()+r.pos);n.length&&(e[n.name]=n);}}Do.prototype.feature=function(t){if(t<0||t>=this._features.length)throw new Error("feature index out of bounds");this._pbf.pos=this._features[t];var e=this._pbf.readVarint()+this._pbf.pos;return new To(this._pbf,e,this.extent,this._keys,this._values)};var jo={VectorTile:function(t,e){this.layers=t.readFields(Ro,{},e);},VectorTileFeature:To,VectorTileLayer:Lo},qo=jo.VectorTileFeature.types,No=Math.pow(2,13);function Ko(t,e,r,n,i,a,o,s){t.emplaceBack(e,r,2*Math.floor(n*No)+o,i*No*2,a*No*2,Math.round(s));}var Zo=function(t){this.zoom=t.zoom,this.overscaling=t.overscaling,this.layers=t.layers,this.layerIds=this.layers.map((function(t){return t.id})),this.index=t.index,this.hasPattern=!1,this.layoutVertexArray=new ai,this.indexArray=new xi,this.programConfigurations=new na(Po,t.layers,t.zoom),this.segments=new Li,this.stateDependentLayerIds=this.layers.filter((function(t){return t.isStateDependent()})).map((function(t){return t.id}));};function Xo(t,e){return t.x===e.x&&(t.x<0||t.x>oa)||t.y===e.y&&(t.y<0||t.y>oa)}function Go(t){return t.every((function(t){return t.x<0}))||t.every((function(t){return t.x>oa}))||t.every((function(t){return t.y<0}))||t.every((function(t){return t.y>oa}))}Zo.prototype.populate=function(t,e){this.features=[],this.hasPattern=zo("fill-extrusion",this.layers,e);for(var r=0,n=t;r<n.length;r+=1){var i=n[r],a=i.feature,o=i.index,s=i.sourceLayerIndex;if(this.layers[0]._featureFilter(new On(this.zoom),a)){var u=la(a),l={sourceLayerIndex:s,index:o,geometry:u,properties:a.properties,type:a.type,patterns:{}};void 0!==a.id&&(l.id=a.id),this.hasPattern?this.features.push(Io("fill-extrusion",this.layers,l,this.zoom,e)):this.addFeature(l,u,o,{}),e.featureIndex.insert(a,u,o,s,this.index,!0);}}},Zo.prototype.addFeatures=function(t,e){for(var r=0,n=this.features;r<n.length;r+=1){var i=n[r],a=i.geometry;this.addFeature(i,a,i.index,e);}},Zo.prototype.update=function(t,e,r){this.stateDependentLayers.length&&this.programConfigurations.updatePaintArrays(t,e,this.stateDependentLayers,r);},Zo.prototype.isEmpty=function(){return 0===this.layoutVertexArray.length},Zo.prototype.uploadPending=function(){return !this.uploaded||this.programConfigurations.needsUpload},Zo.prototype.upload=function(t){this.uploaded||(this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,Po),this.indexBuffer=t.createIndexBuffer(this.indexArray)),this.programConfigurations.upload(t),this.uploaded=!0;},Zo.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.programConfigurations.destroy(),this.segments.destroy());},Zo.prototype.addFeature=function(t,e,r,n){for(var i=0,a=ko(e,500);i<a.length;i+=1){for(var o=a[i],s=0,u=0,l=o;u<l.length;u+=1){s+=l[u].length;}for(var p=this.segments.prepareSegment(4,this.layoutVertexArray,this.indexArray),c=0,h=o;c<h.length;c+=1){var f=h[c];if(0!==f.length&&!Go(f))for(var y=0,d=0;d<f.length;d++){var m=f[d];if(d>=1){var v=f[d-1];if(!Xo(m,v)){p.vertexLength+4>Li.MAX_VERTEX_ARRAY_LENGTH&&(p=this.segments.prepareSegment(4,this.layoutVertexArray,this.indexArray));var g=m.sub(v)._perp()._unit(),x=v.dist(m);y+x>32768&&(y=0),Ko(this.layoutVertexArray,m.x,m.y,g.x,g.y,0,0,y),Ko(this.layoutVertexArray,m.x,m.y,g.x,g.y,0,1,y),y+=x,Ko(this.layoutVertexArray,v.x,v.y,g.x,g.y,0,0,y),Ko(this.layoutVertexArray,v.x,v.y,g.x,g.y,0,1,y);var b=p.vertexLength;this.indexArray.emplaceBack(b,b+2,b+1),this.indexArray.emplaceBack(b+1,b+2,b+3),p.vertexLength+=4,p.primitiveLength+=2;}}}}if(p.vertexLength+s>Li.MAX_VERTEX_ARRAY_LENGTH&&(p=this.segments.prepareSegment(s,this.layoutVertexArray,this.indexArray)),"Polygon"===qo[t.type]){for(var _=[],w=[],A=p.vertexLength,k=0,S=o;k<S.length;k+=1){var z=S[k];if(0!==z.length){z!==o[0]&&w.push(_.length/2);for(var I=0;I<z.length;I++){var C=z[I];Ko(this.layoutVertexArray,C.x,C.y,0,0,1,1,0),_.push(C.x),_.push(C.y);}}}for(var B=Xa(_,w),E=0;E<B.length;E+=3)this.indexArray.emplaceBack(A+B[E],A+B[E+2],A+B[E+1]);p.primitiveLength+=B.length/3,p.vertexLength+=s;}}this.programConfigurations.populatePaintArrays(this.layoutVertexArray.length,t,r,n);},xn("FillExtrusionBucket",Zo,{omit:["layers","features"]});var Jo={paint:new Yn({"fill-extrusion-opacity":new Zn(zt["paint_fill-extrusion"]["fill-extrusion-opacity"]),"fill-extrusion-color":new Xn(zt["paint_fill-extrusion"]["fill-extrusion-color"]),"fill-extrusion-translate":new Zn(zt["paint_fill-extrusion"]["fill-extrusion-translate"]),"fill-extrusion-translate-anchor":new Zn(zt["paint_fill-extrusion"]["fill-extrusion-translate-anchor"]),"fill-extrusion-pattern":new Gn(zt["paint_fill-extrusion"]["fill-extrusion-pattern"]),"fill-extrusion-height":new Xn(zt["paint_fill-extrusion"]["fill-extrusion-height"]),"fill-extrusion-base":new Xn(zt["paint_fill-extrusion"]["fill-extrusion-base"]),"fill-extrusion-vertical-gradient":new Zn(zt["paint_fill-extrusion"]["fill-extrusion-vertical-gradient"])})},Ho=function(t){function e(e){t.call(this,e,Jo);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.createBucket=function(t){return new Zo(t)},e.prototype.queryRadius=function(){return ka(this.paint.get("fill-extrusion-translate"))},e.prototype.is3D=function(){return !0},e.prototype.queryIntersectsFeature=function(t,e,r,n,a,o,s,u){var l=Sa(t,this.paint.get("fill-extrusion-translate"),this.paint.get("fill-extrusion-translate-anchor"),o.angle,s),p=this.paint.get("fill-extrusion-height").evaluate(e,r),c=this.paint.get("fill-extrusion-base").evaluate(e,r),h=function(t,e,r,n){for(var a=[],o=0,s=t;o<s.length;o+=1){var u=s[o],l=[u.x,u.y,n,1];Ma(l,l,e),a.push(new i(l[0]/l[3],l[1]/l[3]));}return a}(l,u,0,0),f=function(t,e,r,n){for(var a=[],o=[],s=n[8]*e,u=n[9]*e,l=n[10]*e,p=n[11]*e,c=n[8]*r,h=n[9]*r,f=n[10]*r,y=n[11]*r,d=0,m=t;d<m.length;d+=1){for(var v=m[d],g=[],x=[],b=0,_=v;b<_.length;b+=1){var w=_[b],A=w.x,k=w.y,S=n[0]*A+n[4]*k+n[12],z=n[1]*A+n[5]*k+n[13],I=n[2]*A+n[6]*k+n[14],C=n[3]*A+n[7]*k+n[15],B=I+l,E=C+p,M=S+c,P=z+h,T=I+f,V=C+y,F=new i((S+s)/E,(z+u)/E);F.z=B/E,g.push(F);var O=new i(M/V,P/V);O.z=T/V,x.push(O);}a.push(g),o.push(x);}return [a,o]}(n,c,p,u);return function(t,e,r){var n=1/0;ya(r,e)&&(n=$o(r,e[0]));for(var i=0;i<e.length;i++)for(var a=e[i],o=t[i],s=0;s<a.length-1;s++){var u=a[s],l=a[s+1],p=o[s],c=o[s+1],h=[u,l,c,p,u];ha(r,h)&&(n=Math.min(n,$o(r,h)));}return n!==1/0&&n}(f[0],f[1],h)},e}($n);function Yo(t,e){return t.x*e.x+t.y*e.y}function $o(t,e){if(1===t.length){var r=e[0],n=e[1],i=e[3],a=t[0],o=n.sub(r),s=i.sub(r),u=a.sub(r),l=Yo(o,o),p=Yo(o,s),c=Yo(s,s),h=Yo(u,o),f=Yo(u,s),y=l*c-p*p,d=(c*h-p*f)/y,m=(l*f-p*h)/y,v=1-d-m;return r.z*v+n.z*d+i.z*m}for(var g=1/0,x=0,b=e;x<b.length;x+=1){var _=b[x];g=Math.min(g,_.z);}return g}var Wo=ei([{name:"a_pos_normal",components:2,type:"Int16"},{name:"a_data",components:4,type:"Uint8"}],4).members,Qo=jo.VectorTileFeature.types,ts=Math.cos(Math.PI/180*37.5),es=Math.pow(2,14)/.5,rs=function(t){this.zoom=t.zoom,this.overscaling=t.overscaling,this.layers=t.layers,this.layerIds=this.layers.map((function(t){return t.id})),this.index=t.index,this.hasPattern=!1,this.patternFeatures=[],this.layoutVertexArray=new oi,this.indexArray=new xi,this.programConfigurations=new na(Wo,t.layers,t.zoom),this.segments=new Li,this.stateDependentLayerIds=this.layers.filter((function(t){return t.isStateDependent()})).map((function(t){return t.id}));};rs.prototype.populate=function(t,e){this.hasPattern=zo("line",this.layers,e);for(var r=this.layers[0].layout.get("line-sort-key"),n=[],i=0,a=t;i<a.length;i+=1){var o=a[i],s=o.feature,u=o.index,l=o.sourceLayerIndex;if(this.layers[0]._featureFilter(new On(this.zoom),s)){var p=la(s),c=r?r.evaluate(s,{}):void 0,h={id:s.id,properties:s.properties,type:s.type,sourceLayerIndex:l,index:u,geometry:p,patterns:{},sortKey:c};n.push(h);}}r&&n.sort((function(t,e){return t.sortKey-e.sortKey}));for(var f=0,y=n;f<y.length;f+=1){var d=y[f],m=d,v=m.geometry,g=m.index,x=m.sourceLayerIndex;if(this.hasPattern){var b=Io("line",this.layers,d,this.zoom,e);this.patternFeatures.push(b);}else this.addFeature(d,v,g,{});var _=t[g].feature;e.featureIndex.insert(_,v,g,x,this.index);}},rs.prototype.update=function(t,e,r){this.stateDependentLayers.length&&this.programConfigurations.updatePaintArrays(t,e,this.stateDependentLayers,r);},rs.prototype.addFeatures=function(t,e){for(var r=0,n=this.patternFeatures;r<n.length;r+=1){var i=n[r];this.addFeature(i,i.geometry,i.index,e);}},rs.prototype.isEmpty=function(){return 0===this.layoutVertexArray.length},rs.prototype.uploadPending=function(){return !this.uploaded||this.programConfigurations.needsUpload},rs.prototype.upload=function(t){this.uploaded||(this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,Wo),this.indexBuffer=t.createIndexBuffer(this.indexArray)),this.programConfigurations.upload(t),this.uploaded=!0;},rs.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.programConfigurations.destroy(),this.segments.destroy());},rs.prototype.addFeature=function(t,e,r,n){for(var i=this.layers[0].layout,a=i.get("line-join").evaluate(t,{}),o=i.get("line-cap"),s=i.get("line-miter-limit"),u=i.get("line-round-limit"),l=0,p=e;l<p.length;l+=1){var c=p[l];this.addLine(c,t,a,o,s,u,r,n);}},rs.prototype.addLine=function(t,e,r,n,i,a,o,s){if(this.distance=0,this.scaledDistance=0,this.totalDistance=0,e.properties&&e.properties.hasOwnProperty("mapbox_clip_start")&&e.properties.hasOwnProperty("mapbox_clip_end")){this.clipStart=+e.properties.mapbox_clip_start,this.clipEnd=+e.properties.mapbox_clip_end;for(var u=0;u<t.length-1;u++)this.totalDistance+=t[u].dist(t[u+1]);}for(var l="Polygon"===Qo[e.type],p=t.length;p>=2&&t[p-1].equals(t[p-2]);)p--;for(var c=0;c<p-1&&t[c].equals(t[c+1]);)c++;if(!(p<(l?3:2))){"bevel"===r&&(i=1.05);var h,f=oa/(512*this.overscaling)*15,y=this.segments.prepareSegment(10*p,this.layoutVertexArray,this.indexArray),d=void 0,m=void 0,v=void 0,g=void 0;this.e1=this.e2=-1,l&&(h=t[p-2],g=t[c].sub(h)._unit()._perp());for(var x=c;x<p;x++)if(!(m=l&&x===p-1?t[c+1]:t[x+1])||!t[x].equals(m)){g&&(v=g),h&&(d=h),h=t[x],g=m?m.sub(h)._unit()._perp():v;var b=(v=v||g).add(g);0===b.x&&0===b.y||b._unit();var _=v.x*g.x+v.y*g.y,w=b.x*g.x+b.y*g.y,A=0!==w?1/w:1/0,k=2*Math.sqrt(2-2*w),S=w<ts&&d&&m,z=v.x*g.y-v.y*g.x>0;if(S&&x>c){var I=h.dist(d);if(I>2*f){var C=h.sub(h.sub(d)._mult(f/I)._round());this.updateDistance(d,C),this.addCurrentVertex(C,v,0,0,y),d=C;}}var B=d&&m,E=B?r:l?"butt":n;if(B&&"round"===E&&(A<a?E="miter":A<=2&&(E="fakeround")),"miter"===E&&A>i&&(E="bevel"),"bevel"===E&&(A>2&&(E="flipbevel"),A<i&&(E="miter")),d&&this.updateDistance(d,h),"miter"===E)b._mult(A),this.addCurrentVertex(h,b,0,0,y);else if("flipbevel"===E){if(A>100)b=g.mult(-1);else{var M=A*v.add(g).mag()/v.sub(g).mag();b._perp()._mult(M*(z?-1:1));}this.addCurrentVertex(h,b,0,0,y),this.addCurrentVertex(h,b.mult(-1),0,0,y);}else if("bevel"===E||"fakeround"===E){var P=-Math.sqrt(A*A-1),T=z?P:0,V=z?0:P;if(d&&this.addCurrentVertex(h,v,T,V,y),"fakeround"===E)for(var F=Math.round(180*k/Math.PI/20),O=1;O<F;O++){var L=O/F;if(.5!==L){var D=L-.5;L+=L*D*(L-1)*((1.0904+_*(_*(3.55645-1.43519*_)-3.2452))*D*D+(.848013+_*(.215638*_-1.06021)));}var U=g.sub(v)._mult(L)._add(v)._unit()._mult(z?-1:1);this.addHalfVertex(h,U.x,U.y,!1,z,0,y);}m&&this.addCurrentVertex(h,g,-T,-V,y);}else if("butt"===E)this.addCurrentVertex(h,b,0,0,y);else if("square"===E){var R=d?1:-1;this.addCurrentVertex(h,b,R,R,y);}else"round"===E&&(d&&(this.addCurrentVertex(h,v,0,0,y),this.addCurrentVertex(h,v,1,1,y,!0)),m&&(this.addCurrentVertex(h,g,-1,-1,y,!0),this.addCurrentVertex(h,g,0,0,y)));if(S&&x<p-1){var j=h.dist(m);if(j>2*f){var q=h.add(m.sub(h)._mult(f/j)._round());this.updateDistance(h,q),this.addCurrentVertex(q,g,0,0,y),h=q;}}}this.programConfigurations.populatePaintArrays(this.layoutVertexArray.length,e,o,s);}},rs.prototype.addCurrentVertex=function(t,e,r,n,i,a){void 0===a&&(a=!1);var o=e.x+e.y*r,s=e.y-e.x*r,u=-e.x+e.y*n,l=-e.y-e.x*n;this.addHalfVertex(t,o,s,a,!1,r,i),this.addHalfVertex(t,u,l,a,!0,-n,i),this.distance>es/2&&0===this.totalDistance&&(this.distance=0,this.addCurrentVertex(t,e,r,n,i,a));},rs.prototype.addHalfVertex=function(t,e,r,n,i,a,o){var s=t.x,u=t.y,l=.5*this.scaledDistance;this.layoutVertexArray.emplaceBack((s<<1)+(n?1:0),(u<<1)+(i?1:0),Math.round(63*e)+128,Math.round(63*r)+128,1+(0===a?0:a<0?-1:1)|(63&l)<<2,l>>6);var p=o.vertexLength++;this.e1>=0&&this.e2>=0&&(this.indexArray.emplaceBack(this.e1,this.e2,p),o.primitiveLength++),i?this.e2=p:this.e1=p;},rs.prototype.updateDistance=function(t,e){this.distance+=t.dist(e),this.scaledDistance=this.totalDistance>0?(this.clipStart+(this.clipEnd-this.clipStart)*this.distance/this.totalDistance)*(es-1):this.distance;},xn("LineBucket",rs,{omit:["layers","patternFeatures"]});var ns=new Yn({"line-cap":new Zn(zt.layout_line["line-cap"]),"line-join":new Xn(zt.layout_line["line-join"]),"line-miter-limit":new Zn(zt.layout_line["line-miter-limit"]),"line-round-limit":new Zn(zt.layout_line["line-round-limit"]),"line-sort-key":new Xn(zt.layout_line["line-sort-key"])}),is={paint:new Yn({"line-opacity":new Xn(zt.paint_line["line-opacity"]),"line-color":new Xn(zt.paint_line["line-color"]),"line-translate":new Zn(zt.paint_line["line-translate"]),"line-translate-anchor":new Zn(zt.paint_line["line-translate-anchor"]),"line-width":new Xn(zt.paint_line["line-width"]),"line-gap-width":new Xn(zt.paint_line["line-gap-width"]),"line-offset":new Xn(zt.paint_line["line-offset"]),"line-blur":new Xn(zt.paint_line["line-blur"]),"line-dasharray":new Jn(zt.paint_line["line-dasharray"]),"line-pattern":new Gn(zt.paint_line["line-pattern"]),"line-gradient":new Hn(zt.paint_line["line-gradient"])}),layout:ns},as=new(function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.possiblyEvaluate=function(e,r){return r=new On(Math.floor(r.zoom),{now:r.now,fadeDuration:r.fadeDuration,zoomHistory:r.zoomHistory,transition:r.transition}),t.prototype.possiblyEvaluate.call(this,e,r)},e.prototype.evaluate=function(e,r,n,i){return r=c({},r,{zoom:Math.floor(r.zoom)}),t.prototype.evaluate.call(this,e,r,n,i)},e}(Xn))(is.paint.properties["line-width"].specification);as.useIntegerZoom=!0;var os=function(t){function e(e){t.call(this,e,is);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype._handleSpecialPaintPropertyUpdate=function(t){"line-gradient"===t&&this._updateGradient();},e.prototype._updateGradient=function(){var t=this._transitionablePaint._values["line-gradient"].value.expression;this.gradient=ja(t,"lineProgress"),this.gradientTexture=null;},e.prototype.recalculate=function(e,r){t.prototype.recalculate.call(this,e,r),this.paint._values["line-floorwidth"]=as.possiblyEvaluate(this._transitioningPaint._values["line-width"].value,e);},e.prototype.createBucket=function(t){return new rs(t)},e.prototype.queryRadius=function(t){var e=t,r=ss(Aa("line-width",this,e),Aa("line-gap-width",this,e)),n=Aa("line-offset",this,e);return r/2+Math.abs(n)+ka(this.paint.get("line-translate"))},e.prototype.queryIntersectsFeature=function(t,e,r,n,a,o,s){var u=Sa(t,this.paint.get("line-translate"),this.paint.get("line-translate-anchor"),o.angle,s),l=s/2*ss(this.paint.get("line-width").evaluate(e,r),this.paint.get("line-gap-width").evaluate(e,r)),p=this.paint.get("line-offset").evaluate(e,r);return p&&(n=function(t,e){for(var r=[],n=new i(0,0),a=0;a<t.length;a++){for(var o=t[a],s=[],u=0;u<o.length;u++){var l=o[u-1],p=o[u],c=o[u+1],h=0===u?n:p.sub(l)._unit()._perp(),f=u===o.length-1?n:c.sub(p)._unit()._perp(),y=h._add(f)._unit(),d=y.x*f.x+y.y*f.y;y._mult(1/d),s.push(y._mult(e)._add(p));}r.push(s);}return r}(n,p*s)),function(t,e,r){for(var n=0;n<e.length;n++){var i=e[n];if(t.length>=3)for(var a=0;a<i.length;a++)if(_a(t,i[a]))return !0;if(da(t,i,r))return !0}return !1}(u,n,l)},e.prototype.isTileClipped=function(){return !0},e}($n);function ss(t,e){return e>0?e+2*t:t}var us=ei([{name:"a_pos_offset",components:4,type:"Int16"},{name:"a_data",components:4,type:"Uint16"}]),ls=ei([{name:"a_projected_pos",components:3,type:"Float32"}],4),ps=(ei([{name:"a_fade_opacity",components:1,type:"Uint32"}],4),ei([{name:"a_placed",components:2,type:"Uint8"},{name:"a_shift",components:2,type:"Float32"}])),cs=(ei([{type:"Int16",name:"anchorPointX"},{type:"Int16",name:"anchorPointY"},{type:"Int16",name:"x1"},{type:"Int16",name:"y1"},{type:"Int16",name:"x2"},{type:"Int16",name:"y2"},{type:"Uint32",name:"featureIndex"},{type:"Uint16",name:"sourceLayerIndex"},{type:"Uint16",name:"bucketIndex"},{type:"Int16",name:"radius"},{type:"Int16",name:"signedDistanceFromAnchor"}]),ei([{name:"a_pos",components:2,type:"Int16"},{name:"a_anchor_pos",components:2,type:"Int16"},{name:"a_extrude",components:2,type:"Int16"}],4)),hs=ei([{name:"a_pos",components:2,type:"Int16"},{name:"a_anchor_pos",components:2,type:"Int16"},{name:"a_extrude",components:2,type:"Int16"}],4);ei([{type:"Int16",name:"anchorX"},{type:"Int16",name:"anchorY"},{type:"Uint16",name:"glyphStartIndex"},{type:"Uint16",name:"numGlyphs"},{type:"Uint32",name:"vertexStartIndex"},{type:"Uint32",name:"lineStartIndex"},{type:"Uint32",name:"lineLength"},{type:"Uint16",name:"segment"},{type:"Uint16",name:"lowerSize"},{type:"Uint16",name:"upperSize"},{type:"Float32",name:"lineOffsetX"},{type:"Float32",name:"lineOffsetY"},{type:"Uint8",name:"writingMode"},{type:"Uint8",name:"placedOrientation"},{type:"Uint8",name:"hidden"},{type:"Uint32",name:"crossTileID"},{type:"Int16",name:"associatedIconIndex"}]),ei([{type:"Int16",name:"anchorX"},{type:"Int16",name:"anchorY"},{type:"Int16",name:"rightJustifiedTextSymbolIndex"},{type:"Int16",name:"centerJustifiedTextSymbolIndex"},{type:"Int16",name:"leftJustifiedTextSymbolIndex"},{type:"Int16",name:"verticalPlacedTextSymbolIndex"},{type:"Int16",name:"placedIconSymbolIndex"},{type:"Uint16",name:"key"},{type:"Uint16",name:"textBoxStartIndex"},{type:"Uint16",name:"textBoxEndIndex"},{type:"Uint16",name:"verticalTextBoxStartIndex"},{type:"Uint16",name:"verticalTextBoxEndIndex"},{type:"Uint16",name:"iconBoxStartIndex"},{type:"Uint16",name:"iconBoxEndIndex"},{type:"Uint16",name:"featureIndex"},{type:"Uint16",name:"numHorizontalGlyphVertices"},{type:"Uint16",name:"numVerticalGlyphVertices"},{type:"Uint16",name:"numIconVertices"},{type:"Uint32",name:"crossTileID"},{type:"Float32",name:"textBoxScale"},{type:"Float32",components:2,name:"textOffset"}]),ei([{type:"Float32",name:"offsetX"}]),ei([{type:"Int16",name:"x"},{type:"Int16",name:"y"},{type:"Int16",name:"tileUnitDistanceFromAnchor"}]);function fs(t,e,r){return t.sections.forEach((function(t){t.text=function(t,e,r){var n=e.layout.get("text-transform").evaluate(r,{});return "uppercase"===n?t=t.toLocaleUpperCase():"lowercase"===n&&(t=t.toLocaleLowerCase()),Fn.applyArabicShaping&&(t=Fn.applyArabicShaping(t)),t}(t.text,e,r);})),t}var ys={"!":"︕","#":"＃",$:"＄","%":"％","&":"＆","(":"︵",")":"︶","*":"＊","+":"＋",",":"︐","-":"︲",".":"・","/":"／",":":"︓",";":"︔","<":"︿","=":"＝",">":"﹀","?":"︖","@":"＠","[":"﹇","\\":"＼","]":"﹈","^":"＾",_:"︳","`":"｀","{":"︷","|":"―","}":"︸","~":"～","¢":"￠","£":"￡","¥":"￥","¦":"￤","¬":"￢","¯":"￣","–":"︲","—":"︱","‘":"﹃","’":"﹄","“":"﹁","”":"﹂","…":"︙","‧":"・","₩":"￦","、":"︑","。":"︒","〈":"︿","〉":"﹀","《":"︽","》":"︾","「":"﹁","」":"﹂","『":"﹃","』":"﹄","【":"︻","】":"︼","〔":"︹","〕":"︺","〖":"︗","〗":"︘","！":"︕","（":"︵","）":"︶","，":"︐","－":"︲","．":"・","：":"︓","；":"︔","＜":"︿","＞":"﹀","？":"︖","［":"﹇","］":"﹈","＿":"︳","｛":"︷","｜":"―","｝":"︸","｟":"︵","｠":"︶","｡":"︒","｢":"﹁","｣":"﹂"};var ds=24,ms={horizontal:1,vertical:2,horizontalOnly:3},vs=function(){this.text="",this.sectionIndex=[],this.sections=[];};function gs(t,e,r,n,i,a,o,s,u,l,p,c){var h,f=vs.fromFeature(t,r);l===ms.vertical&&f.verticalizePunctuation();var y=Fn.processBidirectionalText,d=Fn.processStyledBidirectionalText;if(y&&1===f.sections.length){h=[];for(var m=0,v=y(f.toString(),ks(f,s,n,e,c));m<v.length;m+=1){var g=v[m],x=new vs;x.text=g,x.sections=f.sections;for(var b=0;b<g.length;b++)x.sectionIndex.push(0);h.push(x);}}else if(d){h=[];for(var _=0,w=d(f.text,f.sectionIndex,ks(f,s,n,e,c));_<w.length;_+=1){var A=w[_],k=new vs;k.text=A[0],k.sectionIndex=A[1],k.sections=f.sections,h.push(k);}}else h=function(t,e){for(var r=[],n=t.text,i=0,a=0,o=e;a<o.length;a+=1){var s=o[a];r.push(t.substring(i,s)),i=s;}return i<n.length&&r.push(t.substring(i,n.length)),r}(f,ks(f,s,n,e,c));var S=[],z={positionedGlyphs:S,text:f.toString(),top:u[1],bottom:u[1],left:u[0],right:u[0],writingMode:l,lineCount:h.length,yOffset:-17};return function(t,e,r,n,i,a,o,s,u){for(var l=0,p=t.yOffset,c=0,h=t.positionedGlyphs,f="right"===a?1:"left"===a?0:.5,y=0,d=r;y<d.length;y+=1){var m=d[y];m.trim();var v=m.getMaxScale();if(m.length()){for(var g=h.length,x=0;x<m.length();x++){var b=m.getSection(x),_=m.getSectionIndex(x),w=m.getCharCode(x),A=24*(v-b.scale),k=e[b.fontStack],S=k&&k[w];S&&(o===ms.horizontal||!u&&!In(w)||u&&(xs[w]||(I=w,kn.Arabic(I)||kn["Arabic Supplement"](I)||kn["Arabic Extended-A"](I)||kn["Arabic Presentation Forms-A"](I)||kn["Arabic Presentation Forms-B"](I)))?(h.push({glyph:w,x:l,y:p+A,vertical:!1,scale:b.scale,fontStack:b.fontStack,sectionIndex:_}),l+=S.metrics.advance*b.scale+s):(h.push({glyph:w,x:l,y:p+A,vertical:!0,scale:b.scale,fontStack:b.fontStack,sectionIndex:_}),l+=ds*b.scale+s));}if(h.length!==g){var z=l-s;c=Math.max(z,c),zs(h,e,g,h.length-1,f);}l=0,p+=n*v;}else p+=n;}var I;var C=Ss(i),B=C.horizontalAlign,E=C.verticalAlign;!function(t,e,r,n,i,a,o){for(var s=(e-r)*i,u=(-n*o+.5)*a,l=0;l<t.length;l++)t[l].x+=s,t[l].y+=u;}(h,f,B,E,c,n,r.length);var M=p-t.yOffset;t.top+=-E*M,t.bottom=t.top+M,t.left+=-B*c,t.right=t.left+c;}(z,e,h,i,a,o,l,s,p),!!S.length&&z}vs.fromFeature=function(t,e){for(var r=new vs,n=0;n<t.sections.length;n++){var i=t.sections[n];r.sections.push({scale:i.scale||1,fontStack:i.fontStack||e}),r.text+=i.text;for(var a=0;a<i.text.length;a++)r.sectionIndex.push(n);}return r},vs.prototype.length=function(){return this.text.length},vs.prototype.getSection=function(t){return this.sections[this.sectionIndex[t]]},vs.prototype.getSectionIndex=function(t){return this.sectionIndex[t]},vs.prototype.getCharCode=function(t){return this.text.charCodeAt(t)},vs.prototype.verticalizePunctuation=function(){this.text=function(t){for(var e="",r=0;r<t.length;r++){var n=t.charCodeAt(r+1)||null,i=t.charCodeAt(r-1)||null;(!n||!Cn(n)||ys[t[r+1]])&&(!i||!Cn(i)||ys[t[r-1]])&&ys[t[r]]?e+=ys[t[r]]:e+=t[r];}return e}(this.text);},vs.prototype.trim=function(){for(var t=0,e=0;e<this.text.length&&xs[this.text.charCodeAt(e)];e++)t++;for(var r=this.text.length,n=this.text.length-1;n>=0&&n>=t&&xs[this.text.charCodeAt(n)];n--)r--;this.text=this.text.substring(t,r),this.sectionIndex=this.sectionIndex.slice(t,r);},vs.prototype.substring=function(t,e){var r=new vs;return r.text=this.text.substring(t,e),r.sectionIndex=this.sectionIndex.slice(t,e),r.sections=this.sections,r},vs.prototype.toString=function(){return this.text},vs.prototype.getMaxScale=function(){var t=this;return this.sectionIndex.reduce((function(e,r){return Math.max(e,t.sections[r].scale)}),0)};var xs={9:!0,10:!0,11:!0,12:!0,13:!0,32:!0},bs={};function _s(t,e,r,n){var i=Math.pow(t-e,2);return n?t<e?i/2:2*i:i+Math.abs(r)*r}function ws(t,e,r){var n=0;return 10===t&&(n-=1e4),r&&(n+=150),40!==t&&65288!==t||(n+=50),41!==e&&65289!==e||(n+=50),n}function As(t,e,r,n,i,a){for(var o=null,s=_s(e,r,i,a),u=0,l=n;u<l.length;u+=1){var p=l[u],c=_s(e-p.x,r,i,a)+p.badness;c<=s&&(o=p,s=c);}return {index:t,x:e,priorBreak:o,badness:s}}function ks(t,e,r,n,i){if("point"!==i)return [];if(!t)return [];for(var a,o=[],s=function(t,e,r,n){for(var i=0,a=0;a<t.length();a++){var o=t.getSection(a),s=n[o.fontStack],u=s&&s[t.getCharCode(a)];u&&(i+=u.metrics.advance*o.scale+e);}return i/Math.max(1,Math.ceil(i/r))}(t,e,r,n),u=t.text.indexOf("​")>=0,l=0,p=0;p<t.length();p++){var c=t.getSection(p),h=t.getCharCode(p),f=n[c.fontStack],y=f&&f[h];if(y&&!xs[h]&&(l+=y.metrics.advance*c.scale+e),p<t.length()-1){var d=!!(!((a=h)<11904)&&(kn["Bopomofo Extended"](a)||kn.Bopomofo(a)||kn["CJK Compatibility Forms"](a)||kn["CJK Compatibility Ideographs"](a)||kn["CJK Compatibility"](a)||kn["CJK Radicals Supplement"](a)||kn["CJK Strokes"](a)||kn["CJK Symbols and Punctuation"](a)||kn["CJK Unified Ideographs Extension A"](a)||kn["CJK Unified Ideographs"](a)||kn["Enclosed CJK Letters and Months"](a)||kn["Halfwidth and Fullwidth Forms"](a)||kn.Hiragana(a)||kn["Ideographic Description Characters"](a)||kn["Kangxi Radicals"](a)||kn["Katakana Phonetic Extensions"](a)||kn.Katakana(a)||kn["Vertical Forms"](a)||kn["Yi Radicals"](a)||kn["Yi Syllables"](a)));(bs[h]||d)&&o.push(As(p+1,l,s,o,ws(h,t.getCharCode(p+1),d&&u),!1));}}return function t(e){return e?t(e.priorBreak).concat(e.index):[]}(As(t.length(),l,s,o,0,!0))}function Ss(t){var e=.5,r=.5;switch(t){case"right":case"top-right":case"bottom-right":e=1;break;case"left":case"top-left":case"bottom-left":e=0;}switch(t){case"bottom":case"bottom-right":case"bottom-left":r=1;break;case"top":case"top-right":case"top-left":r=0;}return {horizontalAlign:e,verticalAlign:r}}function zs(t,e,r,n,i){if(i){var a=t[n],o=e[a.fontStack],s=o&&o[a.glyph];if(s)for(var u=s.metrics.advance*a.scale,l=(t[n].x+u)*i,p=r;p<=n;p++)t[p].x-=l;}}bs[10]=!0,bs[32]=!0,bs[38]=!0,bs[40]=!0,bs[41]=!0,bs[43]=!0,bs[45]=!0,bs[47]=!0,bs[173]=!0,bs[183]=!0,bs[8203]=!0,bs[8208]=!0,bs[8211]=!0,bs[8231]=!0;var Is=function(t){function e(e,r,n,i){t.call(this,e,r),this.angle=n,void 0!==i&&(this.segment=i);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.clone=function(){return new e(this.x,this.y,this.angle,this.segment)},e}(i);xn("Anchor",Is);var Cs=256;function Bs(t,e){var r=e.expression;if("constant"===r.kind)return {kind:"constant",layoutSize:r.evaluate(new On(t+1))};if("source"===r.kind)return {kind:"source"};for(var n=r.zoomStops,i=r.interpolationType,a=0;a<n.length&&n[a]<=t;)a++;for(var o=a=Math.max(0,a-1);o<n.length&&n[o]<t+1;)o++;o=Math.min(n.length-1,o);var s=n[a],u=n[o];return "composite"===r.kind?{kind:"composite",minZoom:s,maxZoom:u,interpolationType:i}:{kind:"camera",minZoom:s,maxZoom:u,minSize:r.evaluate(new On(s)),maxSize:r.evaluate(new On(u)),interpolationType:i}}function Es(t,e,r){var n=e.uSize,i=e.uSizeT,a=r.lowerSize,o=r.upperSize;return "source"===t.kind?a/Cs:"composite"===t.kind?Ae(a/Cs,o/Cs,i):n}function Ms(t,e){var r=0,n=0;if("constant"===t.kind)n=t.layoutSize;else if("source"!==t.kind){var i=t.interpolationType,a=t.minZoom,o=t.maxZoom,s=i?l(Ke.interpolationFactor(i,e,a,o),0,1):0;"camera"===t.kind?n=Ae(t.minSize,t.maxSize,s):r=s;}return {uSizeT:r,uSize:n}}var Ps=Object.freeze({getSizeData:Bs,evaluateSizeForFeature:Es,evaluateSizeForZoom:Ms,SIZE_PACK_FACTOR:Cs}),Ts=jo.VectorTileFeature.types,Vs=[{name:"a_fade_opacity",components:1,type:"Uint8",offset:0}];function Fs(t,e,r,n,i,a,o,s){t.emplaceBack(e,r,Math.round(32*n),Math.round(32*i),a,o,s?s[0]:0,s?s[1]:0);}function Os(t,e,r){t.emplaceBack(e.x,e.y,r),t.emplaceBack(e.x,e.y,r),t.emplaceBack(e.x,e.y,r),t.emplaceBack(e.x,e.y,r);}var Ls=function(t){this.layoutVertexArray=new ui,this.indexArray=new xi,this.programConfigurations=t,this.segments=new Li,this.dynamicLayoutVertexArray=new li,this.opacityVertexArray=new pi,this.placedSymbolArray=new Ii;};Ls.prototype.upload=function(t,e,r,n){r&&(this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,us.members),this.indexBuffer=t.createIndexBuffer(this.indexArray,e),this.dynamicLayoutVertexBuffer=t.createVertexBuffer(this.dynamicLayoutVertexArray,ls.members,!0),this.opacityVertexBuffer=t.createVertexBuffer(this.opacityVertexArray,Vs,!0),this.opacityVertexBuffer.itemSize=1),(r||n)&&this.programConfigurations.upload(t);},Ls.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.programConfigurations.destroy(),this.segments.destroy(),this.dynamicLayoutVertexBuffer.destroy(),this.opacityVertexBuffer.destroy());},xn("SymbolBuffers",Ls);var Ds=function(t,e,r){this.layoutVertexArray=new t,this.layoutAttributes=e,this.indexArray=new r,this.segments=new Li,this.collisionVertexArray=new fi;};Ds.prototype.upload=function(t){this.layoutVertexBuffer=t.createVertexBuffer(this.layoutVertexArray,this.layoutAttributes),this.indexBuffer=t.createIndexBuffer(this.indexArray),this.collisionVertexBuffer=t.createVertexBuffer(this.collisionVertexArray,ps.members,!0);},Ds.prototype.destroy=function(){this.layoutVertexBuffer&&(this.layoutVertexBuffer.destroy(),this.indexBuffer.destroy(),this.segments.destroy(),this.collisionVertexBuffer.destroy());},xn("CollisionBuffers",Ds);var Us=function(t){this.collisionBoxArray=t.collisionBoxArray,this.zoom=t.zoom,this.overscaling=t.overscaling,this.layers=t.layers,this.layerIds=this.layers.map((function(t){return t.id})),this.index=t.index,this.pixelRatio=t.pixelRatio,this.sourceLayerIndex=t.sourceLayerIndex,this.hasPattern=!1,this.hasPaintOverrides=!1;var e=this.layers[0]._unevaluatedLayout._values;this.textSizeData=Bs(this.zoom,e["text-size"]),this.iconSizeData=Bs(this.zoom,e["icon-size"]);var r=this.layers[0].layout,n=r.get("symbol-sort-key"),i=r.get("symbol-z-order");this.sortFeaturesByKey="viewport-y"!==i&&void 0!==n.constantOr(1);var a="viewport-y"===i||"auto"===i&&!this.sortFeaturesByKey;this.sortFeaturesByY=a&&(r.get("text-allow-overlap")||r.get("icon-allow-overlap")||r.get("text-ignore-placement")||r.get("icon-ignore-placement")),"point"===r.get("symbol-placement")&&(this.writingModes=r.get("text-writing-mode").map((function(t){return ms[t]}))),this.stateDependentLayerIds=this.layers.filter((function(t){return t.isStateDependent()})).map((function(t){return t.id})),this.sourceID=t.sourceID;};Us.prototype.createArrays=function(){var t=this.layers[0].layout;this.hasPaintOverrides=Ns.hasPaintOverrides(t),this.text=new Ls(new na(us.members,this.layers,this.zoom,(function(t){return /^text/.test(t)}))),this.icon=new Ls(new na(us.members,this.layers,this.zoom,(function(t){return /^icon/.test(t)}))),this.textCollisionBox=new Ds(hi,cs.members,bi),this.iconCollisionBox=new Ds(hi,cs.members,bi),this.textCollisionCircle=new Ds(hi,hs.members,xi),this.iconCollisionCircle=new Ds(hi,hs.members,xi),this.glyphOffsetArray=new Mi,this.lineVertexArray=new Ti,this.symbolInstances=new Bi;},Us.prototype.calculateGlyphDependencies=function(t,e,r,n,i){for(var a=0;a<t.length;a++)if(e[t.charCodeAt(a)]=!0,(r||n)&&i){var o=ys[t.charAt(a)];o&&(e[o.charCodeAt(0)]=!0);}},Us.prototype.populate=function(t,e){var r=this.layers[0],n=r.layout,i=n.get("text-font"),a=n.get("text-field"),o=n.get("icon-image"),s=("constant"!==a.value.kind||a.value.value.toString().length>0)&&("constant"!==i.value.kind||i.value.value.length>0),u="constant"!==o.value.kind||!!o.value.value||Object.keys(o.parameters).length>0,l=n.get("symbol-sort-key");if(this.features=[],s||u){for(var p=e.iconDependencies,c=e.glyphDependencies,h=e.availableImages,f=new On(this.zoom),y=0,d=t;y<d.length;y+=1){var m=d[y],v=m.feature,g=m.index,x=m.sourceLayerIndex;if(r._featureFilter(f,v)){var b=void 0;if(s){var _=r.getValueAndResolveTokens("text-field",v,h);b=fs(_ instanceof Qt?_:Qt.fromString(_),r,v);}var w=void 0;if(u){var A=r.getValueAndResolveTokens("icon-image",v,h);w=A instanceof te?A:A&&"string"!=typeof A?te.fromString(A):te.fromString({name:A,available:!1});}if(b||w){var k=this.sortFeaturesByKey?l.evaluate(v,{}):void 0,S={text:b,icon:w,index:g,sourceLayerIndex:x,geometry:la(v),properties:v.properties,type:Ts[v.type],sortKey:k};if(void 0!==v.id&&(S.id=v.id),this.features.push(S),w&&(p[w.name]=!0),b){var z=i.evaluate(v,{}).join(","),I="map"===n.get("text-rotation-alignment")&&"point"!==n.get("symbol-placement");this.allowVerticalPlacement=this.writingModes&&this.writingModes.indexOf(ms.vertical)>=0;for(var C=0,B=b.sections;C<B.length;C+=1){var E=B[C],M=Sn(b.toString()),P=E.fontStack||z,T=c[P]=c[P]||{};this.calculateGlyphDependencies(E.text,T,I,this.allowVerticalPlacement,M);}}}}}"line"===n.get("symbol-placement")&&(this.features=function(t){var e={},r={},n=[],i=0;function a(e){n.push(t[e]),i++;}function o(t,e,i){var a=r[t];return delete r[t],r[e]=a,n[a].geometry[0].pop(),n[a].geometry[0]=n[a].geometry[0].concat(i[0]),a}function s(t,r,i){var a=e[r];return delete e[r],e[t]=a,n[a].geometry[0].shift(),n[a].geometry[0]=i[0].concat(n[a].geometry[0]),a}function u(t,e,r){var n=r?e[0][e[0].length-1]:e[0][0];return t+":"+n.x+":"+n.y}for(var l=0;l<t.length;l++){var p=t[l],c=p.geometry,h=p.text?p.text.toString():null;if(h){var f=u(h,c),y=u(h,c,!0);if(f in r&&y in e&&r[f]!==e[y]){var d=s(f,y,c),m=o(f,y,n[d].geometry);delete e[f],delete r[y],r[u(h,n[m].geometry,!0)]=m,n[d].geometry=null;}else f in r?o(f,y,c):y in e?s(f,y,c):(a(l),e[f]=i-1,r[y]=i-1);}else a(l);}return n.filter((function(t){return t.geometry}))}(this.features)),this.sortFeaturesByKey&&this.features.sort((function(t,e){return t.sortKey-e.sortKey}));}},Us.prototype.update=function(t,e,r){this.stateDependentLayers.length&&(this.text.programConfigurations.updatePaintArrays(t,e,this.layers,r),this.icon.programConfigurations.updatePaintArrays(t,e,this.layers,r));},Us.prototype.isEmpty=function(){return 0===this.symbolInstances.length},Us.prototype.uploadPending=function(){return !this.uploaded||this.text.programConfigurations.needsUpload||this.icon.programConfigurations.needsUpload},Us.prototype.upload=function(t){this.uploaded||(this.textCollisionBox.upload(t),this.iconCollisionBox.upload(t),this.textCollisionCircle.upload(t),this.iconCollisionCircle.upload(t)),this.text.upload(t,this.sortFeaturesByY,!this.uploaded,this.text.programConfigurations.needsUpload),this.icon.upload(t,this.sortFeaturesByY,!this.uploaded,this.icon.programConfigurations.needsUpload),this.uploaded=!0;},Us.prototype.destroy=function(){this.text.destroy(),this.icon.destroy(),this.textCollisionBox.destroy(),this.iconCollisionBox.destroy(),this.textCollisionCircle.destroy(),this.iconCollisionCircle.destroy();},Us.prototype.addToLineVertexArray=function(t,e){var r=this.lineVertexArray.length;if(void 0!==t.segment){for(var n=t.dist(e[t.segment+1]),i=t.dist(e[t.segment]),a={},o=t.segment+1;o<e.length;o++)a[o]={x:e[o].x,y:e[o].y,tileUnitDistanceFromAnchor:n},o<e.length-1&&(n+=e[o+1].dist(e[o]));for(var s=t.segment||0;s>=0;s--)a[s]={x:e[s].x,y:e[s].y,tileUnitDistanceFromAnchor:i},s>0&&(i+=e[s-1].dist(e[s]));for(var u=0;u<e.length;u++){var l=a[u];this.lineVertexArray.emplaceBack(l.x,l.y,l.tileUnitDistanceFromAnchor);}}return {lineStartIndex:r,lineLength:this.lineVertexArray.length-r}},Us.prototype.addSymbols=function(t,e,r,n,i,a,o,s,u,l,p){var c=this,h=t.indexArray,f=t.layoutVertexArray,y=t.dynamicLayoutVertexArray,d=t.segments.prepareSegment(4*e.length,t.layoutVertexArray,t.indexArray,a.sortKey),m=this.glyphOffsetArray.length,v=d.vertexLength,g=this.allowVerticalPlacement&&o===ms.vertical?Math.PI/2:0,x=function(t){var e=t.tl,n=t.tr,i=t.bl,a=t.br,o=t.tex,u=d.vertexLength,l=t.glyphOffset[1];Fs(f,s.x,s.y,e.x,l+e.y,o.x,o.y,r),Fs(f,s.x,s.y,n.x,l+n.y,o.x+o.w,o.y,r),Fs(f,s.x,s.y,i.x,l+i.y,o.x,o.y+o.h,r),Fs(f,s.x,s.y,a.x,l+a.y,o.x+o.w,o.y+o.h,r),Os(y,s,g),h.emplaceBack(u,u+1,u+2),h.emplaceBack(u+1,u+2,u+3),d.vertexLength+=4,d.primitiveLength+=2,c.glyphOffsetArray.emplaceBack(t.glyphOffset[0]);};if(a.text&&a.text.sections){var b=a.text.sections;if(this.hasPaintOverrides){for(var _,w=function(e,r){void 0===_||_===e&&!r||t.programConfigurations.populatePaintArrays(t.layoutVertexArray.length,a,a.index,{},b[_]),_=e;},A=0,k=e;A<k.length;A+=1){var S=k[A];w(S.sectionIndex,!1),x(S);}w(_,!0);}else{for(var z=0,I=e;z<I.length;z+=1){x(I[z]);}t.programConfigurations.populatePaintArrays(t.layoutVertexArray.length,a,a.index,{},b[0]);}}else{for(var C=0,B=e;C<B.length;C+=1){x(B[C]);}t.programConfigurations.populatePaintArrays(t.layoutVertexArray.length,a,a.index,{});}t.placedSymbolArray.emplaceBack(s.x,s.y,m,this.glyphOffsetArray.length-m,v,u,l,s.segment,r?r[0]:0,r?r[1]:0,n[0],n[1],o,0,!1,0,p);},Us.prototype._addCollisionDebugVertex=function(t,e,r,n,i,a){return e.emplaceBack(0,0),t.emplaceBack(r.x,r.y,n,i,Math.round(a.x),Math.round(a.y))},Us.prototype.addCollisionDebugVertices=function(t,e,r,n,a,o,s,u){var l=a.segments.prepareSegment(4,a.layoutVertexArray,a.indexArray),p=l.vertexLength,c=a.layoutVertexArray,h=a.collisionVertexArray,f=s.anchorX,y=s.anchorY;if(this._addCollisionDebugVertex(c,h,o,f,y,new i(t,e)),this._addCollisionDebugVertex(c,h,o,f,y,new i(r,e)),this._addCollisionDebugVertex(c,h,o,f,y,new i(r,n)),this._addCollisionDebugVertex(c,h,o,f,y,new i(t,n)),l.vertexLength+=4,u){var d=a.indexArray;d.emplaceBack(p,p+1,p+2),d.emplaceBack(p,p+2,p+3),l.primitiveLength+=2;}else{var m=a.indexArray;m.emplaceBack(p,p+1),m.emplaceBack(p+1,p+2),m.emplaceBack(p+2,p+3),m.emplaceBack(p+3,p),l.primitiveLength+=4;}},Us.prototype.addDebugCollisionBoxes=function(t,e,r,n){for(var i=t;i<e;i++){var a=this.collisionBoxArray.get(i),o=a.x1,s=a.y1,u=a.x2,l=a.y2,p=a.radius>0;this.addCollisionDebugVertices(o,s,u,l,p?n?this.textCollisionCircle:this.iconCollisionCircle:n?this.textCollisionBox:this.iconCollisionBox,a.anchorPoint,r,p);}},Us.prototype.generateCollisionDebugBuffers=function(){for(var t=0;t<this.symbolInstances.length;t++){var e=this.symbolInstances.get(t);this.addDebugCollisionBoxes(e.textBoxStartIndex,e.textBoxEndIndex,e,!0),this.addDebugCollisionBoxes(e.verticalTextBoxStartIndex,e.verticalTextBoxEndIndex,e,!0),this.addDebugCollisionBoxes(e.iconBoxStartIndex,e.iconBoxEndIndex,e,!1);}},Us.prototype._deserializeCollisionBoxesForSymbol=function(t,e,r,n,i,a,o){for(var s={},u=e;u<r;u++){var l=t.get(u);if(0===l.radius){s.textBox={x1:l.x1,y1:l.y1,x2:l.x2,y2:l.y2,anchorPointX:l.anchorPointX,anchorPointY:l.anchorPointY},s.textFeatureIndex=l.featureIndex;break}s.textCircles||(s.textCircles=[],s.textFeatureIndex=l.featureIndex);s.textCircles.push(l.anchorPointX,l.anchorPointY,l.radius,l.signedDistanceFromAnchor,1);}for(var p=n;p<i;p++){var c=t.get(p);if(0===c.radius){s.verticalTextBox={x1:c.x1,y1:c.y1,x2:c.x2,y2:c.y2,anchorPointX:c.anchorPointX,anchorPointY:c.anchorPointY},s.verticalTextFeatureIndex=c.featureIndex;break}}for(var h=a;h<o;h++){var f=t.get(h);if(0===f.radius){s.iconBox={x1:f.x1,y1:f.y1,x2:f.x2,y2:f.y2,anchorPointX:f.anchorPointX,anchorPointY:f.anchorPointY},s.iconFeatureIndex=f.featureIndex;break}}return s},Us.prototype.deserializeCollisionBoxes=function(t){this.collisionArrays=[];for(var e=0;e<this.symbolInstances.length;e++){var r=this.symbolInstances.get(e);this.collisionArrays.push(this._deserializeCollisionBoxesForSymbol(t,r.textBoxStartIndex,r.textBoxEndIndex,r.verticalTextBoxStartIndex,r.verticalTextBoxEndIndex,r.iconBoxStartIndex,r.iconBoxEndIndex));}},Us.prototype.hasTextData=function(){return this.text.segments.get().length>0},Us.prototype.hasIconData=function(){return this.icon.segments.get().length>0},Us.prototype.hasTextCollisionBoxData=function(){return this.textCollisionBox.segments.get().length>0},Us.prototype.hasIconCollisionBoxData=function(){return this.iconCollisionBox.segments.get().length>0},Us.prototype.hasTextCollisionCircleData=function(){return this.textCollisionCircle.segments.get().length>0},Us.prototype.hasIconCollisionCircleData=function(){return this.iconCollisionCircle.segments.get().length>0},Us.prototype.addIndicesForPlacedTextSymbol=function(t){for(var e=this.text.placedSymbolArray.get(t),r=e.vertexStartIndex+4*e.numGlyphs,n=e.vertexStartIndex;n<r;n+=4)this.text.indexArray.emplaceBack(n,n+1,n+2),this.text.indexArray.emplaceBack(n+1,n+2,n+3);},Us.prototype.getSortedSymbolIndexes=function(t){if(this.sortedAngle===t&&void 0!==this.symbolInstanceIndexes)return this.symbolInstanceIndexes;for(var e=Math.sin(t),r=Math.cos(t),n=[],i=[],a=[],o=0;o<this.symbolInstances.length;++o){a.push(o);var s=this.symbolInstances.get(o);n.push(0|Math.round(e*s.anchorX+r*s.anchorY)),i.push(s.featureIndex);}return a.sort((function(t,e){return n[t]-n[e]||i[e]-i[t]})),a},Us.prototype.sortFeatures=function(t){var e=this;if(this.sortFeaturesByY&&this.sortedAngle!==t&&!(this.text.segments.get().length>1||this.icon.segments.get().length>1)){this.symbolInstanceIndexes=this.getSortedSymbolIndexes(t),this.sortedAngle=t,this.text.indexArray.clear(),this.icon.indexArray.clear(),this.featureSortOrder=[];for(var r=0,n=this.symbolInstanceIndexes;r<n.length;r+=1){var i=n[r],a=this.symbolInstances.get(i);this.featureSortOrder.push(a.featureIndex),[a.rightJustifiedTextSymbolIndex,a.centerJustifiedTextSymbolIndex,a.leftJustifiedTextSymbolIndex].forEach((function(t,r,n){t>=0&&n.indexOf(t)===r&&e.addIndicesForPlacedTextSymbol(t);})),a.verticalPlacedTextSymbolIndex>=0&&this.addIndicesForPlacedTextSymbol(a.verticalPlacedTextSymbolIndex);var o=this.icon.placedSymbolArray.get(i);if(o.numGlyphs){var s=o.vertexStartIndex;this.icon.indexArray.emplaceBack(s,s+1,s+2),this.icon.indexArray.emplaceBack(s+1,s+2,s+3);}}this.text.indexBuffer&&this.text.indexBuffer.updateData(this.text.indexArray),this.icon.indexBuffer&&this.icon.indexBuffer.updateData(this.icon.indexArray);}},xn("SymbolBucket",Us,{omit:["layers","collisionBoxArray","features","compareText"]}),Us.MAX_GLYPHS=65535,Us.addDynamicAttributes=Os;var Rs=new Yn({"symbol-placement":new Zn(zt.layout_symbol["symbol-placement"]),"symbol-spacing":new Zn(zt.layout_symbol["symbol-spacing"]),"symbol-avoid-edges":new Zn(zt.layout_symbol["symbol-avoid-edges"]),"symbol-sort-key":new Xn(zt.layout_symbol["symbol-sort-key"]),"symbol-z-order":new Zn(zt.layout_symbol["symbol-z-order"]),"icon-allow-overlap":new Zn(zt.layout_symbol["icon-allow-overlap"]),"icon-ignore-placement":new Zn(zt.layout_symbol["icon-ignore-placement"]),"icon-optional":new Zn(zt.layout_symbol["icon-optional"]),"icon-rotation-alignment":new Zn(zt.layout_symbol["icon-rotation-alignment"]),"icon-size":new Xn(zt.layout_symbol["icon-size"]),"icon-text-fit":new Zn(zt.layout_symbol["icon-text-fit"]),"icon-text-fit-padding":new Zn(zt.layout_symbol["icon-text-fit-padding"]),"icon-image":new Xn(zt.layout_symbol["icon-image"]),"icon-rotate":new Xn(zt.layout_symbol["icon-rotate"]),"icon-padding":new Zn(zt.layout_symbol["icon-padding"]),"icon-keep-upright":new Zn(zt.layout_symbol["icon-keep-upright"]),"icon-offset":new Xn(zt.layout_symbol["icon-offset"]),"icon-anchor":new Xn(zt.layout_symbol["icon-anchor"]),"icon-pitch-alignment":new Zn(zt.layout_symbol["icon-pitch-alignment"]),"text-pitch-alignment":new Zn(zt.layout_symbol["text-pitch-alignment"]),"text-rotation-alignment":new Zn(zt.layout_symbol["text-rotation-alignment"]),"text-field":new Xn(zt.layout_symbol["text-field"]),"text-font":new Xn(zt.layout_symbol["text-font"]),"text-size":new Xn(zt.layout_symbol["text-size"]),"text-max-width":new Xn(zt.layout_symbol["text-max-width"]),"text-line-height":new Zn(zt.layout_symbol["text-line-height"]),"text-letter-spacing":new Xn(zt.layout_symbol["text-letter-spacing"]),"text-justify":new Xn(zt.layout_symbol["text-justify"]),"text-radial-offset":new Xn(zt.layout_symbol["text-radial-offset"]),"text-variable-anchor":new Zn(zt.layout_symbol["text-variable-anchor"]),"text-anchor":new Xn(zt.layout_symbol["text-anchor"]),"text-max-angle":new Zn(zt.layout_symbol["text-max-angle"]),"text-writing-mode":new Zn(zt.layout_symbol["text-writing-mode"]),"text-rotate":new Xn(zt.layout_symbol["text-rotate"]),"text-padding":new Zn(zt.layout_symbol["text-padding"]),"text-keep-upright":new Zn(zt.layout_symbol["text-keep-upright"]),"text-transform":new Xn(zt.layout_symbol["text-transform"]),"text-offset":new Xn(zt.layout_symbol["text-offset"]),"text-allow-overlap":new Zn(zt.layout_symbol["text-allow-overlap"]),"text-ignore-placement":new Zn(zt.layout_symbol["text-ignore-placement"]),"text-optional":new Zn(zt.layout_symbol["text-optional"])}),js={paint:new Yn({"icon-opacity":new Xn(zt.paint_symbol["icon-opacity"]),"icon-color":new Xn(zt.paint_symbol["icon-color"]),"icon-halo-color":new Xn(zt.paint_symbol["icon-halo-color"]),"icon-halo-width":new Xn(zt.paint_symbol["icon-halo-width"]),"icon-halo-blur":new Xn(zt.paint_symbol["icon-halo-blur"]),"icon-translate":new Zn(zt.paint_symbol["icon-translate"]),"icon-translate-anchor":new Zn(zt.paint_symbol["icon-translate-anchor"]),"text-opacity":new Xn(zt.paint_symbol["text-opacity"]),"text-color":new Xn(zt.paint_symbol["text-color"],{runtimeType:Ut,getOverride:function(t){return t.textColor},hasOverride:function(t){return !!t.textColor}}),"text-halo-color":new Xn(zt.paint_symbol["text-halo-color"]),"text-halo-width":new Xn(zt.paint_symbol["text-halo-width"]),"text-halo-blur":new Xn(zt.paint_symbol["text-halo-blur"]),"text-translate":new Zn(zt.paint_symbol["text-translate"]),"text-translate-anchor":new Zn(zt.paint_symbol["text-translate-anchor"])}),layout:Rs},qs=function(t){this.type=t.property.overrides?t.property.overrides.runtimeType:Ft,this.defaultValue=t;};qs.prototype.evaluate=function(t){if(t.formattedSection){var e=this.defaultValue.property.overrides;if(e&&e.hasOverride(t.formattedSection))return e.getOverride(t.formattedSection)}return t.feature&&t.featureState?this.defaultValue.evaluate(t.feature,t.featureState):this.defaultValue.property.specification.default},qs.prototype.eachChild=function(t){this.defaultValue.isConstant()||t(this.defaultValue.value._styleExpression.expression);},qs.prototype.possibleOutputs=function(){return [void 0]},qs.prototype.serialize=function(){return null},xn("FormatSectionOverride",qs,{omit:["defaultValue"]});var Ns=function(t){function e(e){t.call(this,e,js);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.recalculate=function(e,r){if(t.prototype.recalculate.call(this,e,r),"auto"===this.layout.get("icon-rotation-alignment")&&("point"!==this.layout.get("symbol-placement")?this.layout._values["icon-rotation-alignment"]="map":this.layout._values["icon-rotation-alignment"]="viewport"),"auto"===this.layout.get("text-rotation-alignment")&&("point"!==this.layout.get("symbol-placement")?this.layout._values["text-rotation-alignment"]="map":this.layout._values["text-rotation-alignment"]="viewport"),"auto"===this.layout.get("text-pitch-alignment")&&(this.layout._values["text-pitch-alignment"]=this.layout.get("text-rotation-alignment")),"auto"===this.layout.get("icon-pitch-alignment")&&(this.layout._values["icon-pitch-alignment"]=this.layout.get("icon-rotation-alignment")),"point"===this.layout.get("symbol-placement")){var n=this.layout.get("text-writing-mode");if(n){for(var i=[],a=0,o=n;a<o.length;a+=1){var s=o[a];i.indexOf(s)<0&&i.push(s);}this.layout._values["text-writing-mode"]=i;}else this.layout._values["text-writing-mode"]=["horizontal"];}this._setPaintOverrides();},e.prototype.getValueAndResolveTokens=function(t,e,r){var n=this.layout.get(t).evaluate(e,{},r),i=this._unevaluatedLayout._values[t];return i.isDataDriven()||Ir(i.value)||!n?n:function(t,e){return e.replace(/{([^{}]+)}/g,(function(e,r){return r in t?String(t[r]):""}))}(e.properties,n)},e.prototype.createBucket=function(t){return new Us(t)},e.prototype.queryRadius=function(){return 0},e.prototype.queryIntersectsFeature=function(){return !1},e.prototype._setPaintOverrides=function(){for(var t=0,r=js.paint.overridableProperties;t<r.length;t+=1){var n=r[t];if(e.hasPaintOverride(this.layout,n)){var i=this.paint.get(n),a=new qs(i),o=new zr(a,i.property.specification),s=null;s="constant"===i.value.kind||"source"===i.value.kind?new Br("source",o):new Er("composite",o,i.value.zoomStops,i.value._interpolationType),this.paint._values[n]=new Nn(i.property,s,i.parameters);}}},e.prototype._handleOverridablePaintPropertyUpdate=function(t,r,n){return !(!this.layout||r.isDataDriven()||n.isDataDriven())&&e.hasPaintOverride(this.layout,t)},e.hasPaintOverride=function(t,e){var r=t.get("text-field"),n=js.paint.properties[e],i=!1,a=function(t){for(var e=0,r=t;e<r.length;e+=1){var a=r[e];if(n.overrides&&n.overrides.hasOverride(a))return void(i=!0)}};if("constant"===r.value.kind&&r.value.value instanceof Qt)a(r.value.value.sections);else if("source"===r.value.kind){var o=function(t){if(!i)if(t instanceof ie&&re(t.value)===Nt){var e=t.value;a(e.sections);}else t instanceof ue?a(t.sections):t.eachChild(o);},s=r.value;s._styleExpression&&o(s._styleExpression.expression);}return i},e.hasPaintOverrides=function(t){for(var r=0,n=js.paint.overridableProperties;r<n.length;r+=1){var i=n[r];if(e.hasPaintOverride(t,i))return !0}return !1},e}($n),Ks={paint:new Yn({"background-color":new Zn(zt.paint_background["background-color"]),"background-pattern":new Jn(zt.paint_background["background-pattern"]),"background-opacity":new Zn(zt.paint_background["background-opacity"])})},Zs=function(t){function e(e){t.call(this,e,Ks);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e}($n),Xs={paint:new Yn({"raster-opacity":new Zn(zt.paint_raster["raster-opacity"]),"raster-hue-rotate":new Zn(zt.paint_raster["raster-hue-rotate"]),"raster-brightness-min":new Zn(zt.paint_raster["raster-brightness-min"]),"raster-brightness-max":new Zn(zt.paint_raster["raster-brightness-max"]),"raster-saturation":new Zn(zt.paint_raster["raster-saturation"]),"raster-contrast":new Zn(zt.paint_raster["raster-contrast"]),"raster-resampling":new Zn(zt.paint_raster["raster-resampling"]),"raster-fade-duration":new Zn(zt.paint_raster["raster-fade-duration"])})},Gs=function(t){function e(e){t.call(this,e,Xs);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e}($n);var Js=function(t){function e(e){t.call(this,e,{}),this.implementation=e;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.is3D=function(){return "3d"===this.implementation.renderingMode},e.prototype.hasOffscreenPass=function(){return void 0!==this.implementation.prerender},e.prototype.recalculate=function(){},e.prototype.updateTransitions=function(){},e.prototype.hasTransition=function(){},e.prototype.serialize=function(){},e.prototype.onAdd=function(t){this.implementation.onAdd&&this.implementation.onAdd(t,t.painter.context.gl);},e.prototype.onRemove=function(t){this.implementation.onRemove&&this.implementation.onRemove(t,t.painter.context.gl);},e}($n),Hs={circle:Pa,heatmap:qa,hillshade:Ka,fill:Mo,"fill-extrusion":Ho,line:os,symbol:Ns,background:Zs,raster:Gs};function Ys(t){for(var e=0,r=0,n=0,i=t;n<i.length;n+=1){var a=i[n];e+=a.w*a.h,r=Math.max(r,a.w);}t.sort((function(t,e){return e.h-t.h}));for(var o=[{x:0,y:0,w:Math.max(Math.ceil(Math.sqrt(e/.95)),r),h:1/0}],s=0,u=0,l=0,p=t;l<p.length;l+=1)for(var c=p[l],h=o.length-1;h>=0;h--){var f=o[h];if(!(c.w>f.w||c.h>f.h)){if(c.x=f.x,c.y=f.y,u=Math.max(u,c.y+c.h),s=Math.max(s,c.x+c.w),c.w===f.w&&c.h===f.h){var y=o.pop();h<o.length&&(o[h]=y);}else c.h===f.h?(f.x+=c.w,f.w-=c.w):c.w===f.w?(f.y+=c.h,f.h-=c.h):(o.push({x:f.x+c.w,y:f.y,w:f.w-c.w,h:c.h}),f.y+=c.h,f.h-=c.h);break}}return {w:s,h:u,fill:e/(s*u)||0}}var $s=function(t,e){var r=e.pixelRatio,n=e.version;this.paddedRect=t,this.pixelRatio=r,this.version=n;},Ws={tl:{configurable:!0},br:{configurable:!0},tlbr:{configurable:!0},displaySize:{configurable:!0}};Ws.tl.get=function(){return [this.paddedRect.x+1,this.paddedRect.y+1]},Ws.br.get=function(){return [this.paddedRect.x+this.paddedRect.w-1,this.paddedRect.y+this.paddedRect.h-1]},Ws.tlbr.get=function(){return this.tl.concat(this.br)},Ws.displaySize.get=function(){return [(this.paddedRect.w-2)/this.pixelRatio,(this.paddedRect.h-2)/this.pixelRatio]},Object.defineProperties($s.prototype,Ws);var Qs=function(t,e){var r={},n={};this.haveRenderCallbacks=[];var i=[];this.addImages(t,r,i),this.addImages(e,n,i);var a=Ys(i),o=a.w,s=a.h,u=new Ua({width:o||1,height:s||1});for(var l in t){var p=t[l],c=r[l].paddedRect;Ua.copy(p.data,u,{x:0,y:0},{x:c.x+1,y:c.y+1},p.data);}for(var h in e){var f=e[h],y=n[h].paddedRect,d=y.x+1,m=y.y+1,v=f.data.width,g=f.data.height;Ua.copy(f.data,u,{x:0,y:0},{x:d,y:m},f.data),Ua.copy(f.data,u,{x:0,y:g-1},{x:d,y:m-1},{width:v,height:1}),Ua.copy(f.data,u,{x:0,y:0},{x:d,y:m+g},{width:v,height:1}),Ua.copy(f.data,u,{x:v-1,y:0},{x:d-1,y:m},{width:1,height:g}),Ua.copy(f.data,u,{x:0,y:0},{x:d+v,y:m},{width:1,height:g});}this.image=u,this.iconPositions=r,this.patternPositions=n;};Qs.prototype.addImages=function(t,e,r){for(var n in t){var i=t[n],a={x:0,y:0,w:i.data.width+2,h:i.data.height+2};r.push(a),e[n]=new $s(a,i),i.hasRenderCallback&&this.haveRenderCallbacks.push(n);}},Qs.prototype.patchUpdatedImages=function(t,e){for(var r in t.dispatchRenderCallbacks(this.haveRenderCallbacks),t.updatedImages)this.patchUpdatedImage(this.iconPositions[r],t.getImage(r),e),this.patchUpdatedImage(this.patternPositions[r],t.getImage(r),e);},Qs.prototype.patchUpdatedImage=function(t,e,r){if(t&&e&&t.version!==e.version){t.version=e.version;var n=t.tl,i=n[0],a=n[1];r.update(e.data,void 0,{x:i,y:a});}},xn("ImagePosition",$s),xn("ImageAtlas",Qs);var tu=self.HTMLImageElement,eu=self.HTMLCanvasElement,ru=self.HTMLVideoElement,nu=self.ImageData,iu=function(t,e,r,n){this.context=t,this.format=r,this.texture=t.gl.createTexture(),this.update(e,n);};iu.prototype.update=function(t,e,r){var n=t.width,i=t.height,a=!(this.size&&this.size[0]===n&&this.size[1]===i||r),o=this.context,s=o.gl;if(this.useMipmap=Boolean(e&&e.useMipmap),s.bindTexture(s.TEXTURE_2D,this.texture),o.pixelStoreUnpackFlipY.set(!1),o.pixelStoreUnpack.set(1),o.pixelStoreUnpackPremultiplyAlpha.set(this.format===s.RGBA&&(!e||!1!==e.premultiply)),a)this.size=[n,i],t instanceof tu||t instanceof eu||t instanceof ru||t instanceof nu?s.texImage2D(s.TEXTURE_2D,0,this.format,this.format,s.UNSIGNED_BYTE,t):s.texImage2D(s.TEXTURE_2D,0,this.format,n,i,0,this.format,s.UNSIGNED_BYTE,t.data);else{var u=r||{x:0,y:0},l=u.x,p=u.y;t instanceof tu||t instanceof eu||t instanceof ru||t instanceof nu?s.texSubImage2D(s.TEXTURE_2D,0,l,p,s.RGBA,s.UNSIGNED_BYTE,t):s.texSubImage2D(s.TEXTURE_2D,0,l,p,n,i,s.RGBA,s.UNSIGNED_BYTE,t.data);}this.useMipmap&&this.isSizePowerOfTwo()&&s.generateMipmap(s.TEXTURE_2D);},iu.prototype.bind=function(t,e,r){var n=this.context.gl;n.bindTexture(n.TEXTURE_2D,this.texture),r!==n.LINEAR_MIPMAP_NEAREST||this.isSizePowerOfTwo()||(r=n.LINEAR),t!==this.filter&&(n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,t),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,r||t),this.filter=t),e!==this.wrap&&(n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,e),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,e),this.wrap=e);},iu.prototype.isSizePowerOfTwo=function(){return this.size[0]===this.size[1]&&Math.log(this.size[0])/Math.LN2%1==0},iu.prototype.destroy=function(){this.context.gl.deleteTexture(this.texture),this.texture=null;};var au=function(t,e,r,n,i){var a,o,s=8*i-n-1,u=(1<<s)-1,l=u>>1,p=-7,c=r?i-1:0,h=r?-1:1,f=t[e+c];for(c+=h,a=f&(1<<-p)-1,f>>=-p,p+=s;p>0;a=256*a+t[e+c],c+=h,p-=8);for(o=a&(1<<-p)-1,a>>=-p,p+=n;p>0;o=256*o+t[e+c],c+=h,p-=8);if(0===a)a=1-l;else{if(a===u)return o?NaN:1/0*(f?-1:1);o+=Math.pow(2,n),a-=l;}return (f?-1:1)*o*Math.pow(2,a-n)},ou=function(t,e,r,n,i,a){var o,s,u,l=8*a-i-1,p=(1<<l)-1,c=p>>1,h=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,f=n?0:a-1,y=n?1:-1,d=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(s=isNaN(e)?1:0,o=p):(o=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-o))<1&&(o--,u*=2),(e+=o+c>=1?h/u:h*Math.pow(2,1-c))*u>=2&&(o++,u/=2),o+c>=p?(s=0,o=p):o+c>=1?(s=(e*u-1)*Math.pow(2,i),o+=c):(s=e*Math.pow(2,c-1)*Math.pow(2,i),o=0));i>=8;t[r+f]=255&s,f+=y,s/=256,i-=8);for(o=o<<i|s,l+=i;l>0;t[r+f]=255&o,f+=y,o/=256,l-=8);t[r+f-y]|=128*d;},su=uu;function uu(t){this.buf=ArrayBuffer.isView&&ArrayBuffer.isView(t)?t:new Uint8Array(t||0),this.pos=0,this.type=0,this.length=this.buf.length;}uu.Varint=0,uu.Fixed64=1,uu.Bytes=2,uu.Fixed32=5;function lu(t){return t.type===uu.Bytes?t.readVarint()+t.pos:t.pos+1}function pu(t,e,r){return r?4294967296*e+(t>>>0):4294967296*(e>>>0)+(t>>>0)}function cu(t,e,r){var n=e<=16383?1:e<=2097151?2:e<=268435455?3:Math.floor(Math.log(e)/(7*Math.LN2));r.realloc(n);for(var i=r.pos-1;i>=t;i--)r.buf[i+n]=r.buf[i];}function hu(t,e){for(var r=0;r<t.length;r++)e.writeVarint(t[r]);}function fu(t,e){for(var r=0;r<t.length;r++)e.writeSVarint(t[r]);}function yu(t,e){for(var r=0;r<t.length;r++)e.writeFloat(t[r]);}function du(t,e){for(var r=0;r<t.length;r++)e.writeDouble(t[r]);}function mu(t,e){for(var r=0;r<t.length;r++)e.writeBoolean(t[r]);}function vu(t,e){for(var r=0;r<t.length;r++)e.writeFixed32(t[r]);}function gu(t,e){for(var r=0;r<t.length;r++)e.writeSFixed32(t[r]);}function xu(t,e){for(var r=0;r<t.length;r++)e.writeFixed64(t[r]);}function bu(t,e){for(var r=0;r<t.length;r++)e.writeSFixed64(t[r]);}function _u(t,e){return (t[e]|t[e+1]<<8|t[e+2]<<16)+16777216*t[e+3]}function wu(t,e,r){t[r]=e,t[r+1]=e>>>8,t[r+2]=e>>>16,t[r+3]=e>>>24;}function Au(t,e){return (t[e]|t[e+1]<<8|t[e+2]<<16)+(t[e+3]<<24)}uu.prototype={destroy:function(){this.buf=null;},readFields:function(t,e,r){for(r=r||this.length;this.pos<r;){var n=this.readVarint(),i=n>>3,a=this.pos;this.type=7&n,t(i,e,this),this.pos===a&&this.skip(n);}return e},readMessage:function(t,e){return this.readFields(t,e,this.readVarint()+this.pos)},readFixed32:function(){var t=_u(this.buf,this.pos);return this.pos+=4,t},readSFixed32:function(){var t=Au(this.buf,this.pos);return this.pos+=4,t},readFixed64:function(){var t=_u(this.buf,this.pos)+4294967296*_u(this.buf,this.pos+4);return this.pos+=8,t},readSFixed64:function(){var t=_u(this.buf,this.pos)+4294967296*Au(this.buf,this.pos+4);return this.pos+=8,t},readFloat:function(){var t=au(this.buf,this.pos,!0,23,4);return this.pos+=4,t},readDouble:function(){var t=au(this.buf,this.pos,!0,52,8);return this.pos+=8,t},readVarint:function(t){var e,r,n=this.buf;return e=127&(r=n[this.pos++]),r<128?e:(e|=(127&(r=n[this.pos++]))<<7,r<128?e:(e|=(127&(r=n[this.pos++]))<<14,r<128?e:(e|=(127&(r=n[this.pos++]))<<21,r<128?e:function(t,e,r){var n,i,a=r.buf;if(i=a[r.pos++],n=(112&i)>>4,i<128)return pu(t,n,e);if(i=a[r.pos++],n|=(127&i)<<3,i<128)return pu(t,n,e);if(i=a[r.pos++],n|=(127&i)<<10,i<128)return pu(t,n,e);if(i=a[r.pos++],n|=(127&i)<<17,i<128)return pu(t,n,e);if(i=a[r.pos++],n|=(127&i)<<24,i<128)return pu(t,n,e);if(i=a[r.pos++],n|=(1&i)<<31,i<128)return pu(t,n,e);throw new Error("Expected varint not more than 10 bytes")}(e|=(15&(r=n[this.pos]))<<28,t,this))))},readVarint64:function(){return this.readVarint(!0)},readSVarint:function(){var t=this.readVarint();return t%2==1?(t+1)/-2:t/2},readBoolean:function(){return Boolean(this.readVarint())},readString:function(){var t=this.readVarint()+this.pos,e=function(t,e,r){var n="",i=e;for(;i<r;){var a,o,s,u=t[i],l=null,p=u>239?4:u>223?3:u>191?2:1;if(i+p>r)break;1===p?u<128&&(l=u):2===p?128==(192&(a=t[i+1]))&&(l=(31&u)<<6|63&a)<=127&&(l=null):3===p?(a=t[i+1],o=t[i+2],128==(192&a)&&128==(192&o)&&((l=(15&u)<<12|(63&a)<<6|63&o)<=2047||l>=55296&&l<=57343)&&(l=null)):4===p&&(a=t[i+1],o=t[i+2],s=t[i+3],128==(192&a)&&128==(192&o)&&128==(192&s)&&((l=(15&u)<<18|(63&a)<<12|(63&o)<<6|63&s)<=65535||l>=1114112)&&(l=null)),null===l?(l=65533,p=1):l>65535&&(l-=65536,n+=String.fromCharCode(l>>>10&1023|55296),l=56320|1023&l),n+=String.fromCharCode(l),i+=p;}return n}(this.buf,this.pos,t);return this.pos=t,e},readBytes:function(){var t=this.readVarint()+this.pos,e=this.buf.subarray(this.pos,t);return this.pos=t,e},readPackedVarint:function(t,e){if(this.type!==uu.Bytes)return t.push(this.readVarint(e));var r=lu(this);for(t=t||[];this.pos<r;)t.push(this.readVarint(e));return t},readPackedSVarint:function(t){if(this.type!==uu.Bytes)return t.push(this.readSVarint());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readSVarint());return t},readPackedBoolean:function(t){if(this.type!==uu.Bytes)return t.push(this.readBoolean());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readBoolean());return t},readPackedFloat:function(t){if(this.type!==uu.Bytes)return t.push(this.readFloat());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readFloat());return t},readPackedDouble:function(t){if(this.type!==uu.Bytes)return t.push(this.readDouble());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readDouble());return t},readPackedFixed32:function(t){if(this.type!==uu.Bytes)return t.push(this.readFixed32());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readFixed32());return t},readPackedSFixed32:function(t){if(this.type!==uu.Bytes)return t.push(this.readSFixed32());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readSFixed32());return t},readPackedFixed64:function(t){if(this.type!==uu.Bytes)return t.push(this.readFixed64());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readFixed64());return t},readPackedSFixed64:function(t){if(this.type!==uu.Bytes)return t.push(this.readSFixed64());var e=lu(this);for(t=t||[];this.pos<e;)t.push(this.readSFixed64());return t},skip:function(t){var e=7&t;if(e===uu.Varint)for(;this.buf[this.pos++]>127;);else if(e===uu.Bytes)this.pos=this.readVarint()+this.pos;else if(e===uu.Fixed32)this.pos+=4;else{if(e!==uu.Fixed64)throw new Error("Unimplemented type: "+e);this.pos+=8;}},writeTag:function(t,e){this.writeVarint(t<<3|e);},realloc:function(t){for(var e=this.length||16;e<this.pos+t;)e*=2;if(e!==this.length){var r=new Uint8Array(e);r.set(this.buf),this.buf=r,this.length=e;}},finish:function(){return this.length=this.pos,this.pos=0,this.buf.subarray(0,this.length)},writeFixed32:function(t){this.realloc(4),wu(this.buf,t,this.pos),this.pos+=4;},writeSFixed32:function(t){this.realloc(4),wu(this.buf,t,this.pos),this.pos+=4;},writeFixed64:function(t){this.realloc(8),wu(this.buf,-1&t,this.pos),wu(this.buf,Math.floor(t*(1/4294967296)),this.pos+4),this.pos+=8;},writeSFixed64:function(t){this.realloc(8),wu(this.buf,-1&t,this.pos),wu(this.buf,Math.floor(t*(1/4294967296)),this.pos+4),this.pos+=8;},writeVarint:function(t){(t=+t||0)>268435455||t<0?function(t,e){var r,n;t>=0?(r=t%4294967296|0,n=t/4294967296|0):(n=~(-t/4294967296),4294967295^(r=~(-t%4294967296))?r=r+1|0:(r=0,n=n+1|0));if(t>=0x10000000000000000||t<-0x10000000000000000)throw new Error("Given varint doesn't fit into 10 bytes");e.realloc(10),function(t,e,r){r.buf[r.pos++]=127&t|128,t>>>=7,r.buf[r.pos++]=127&t|128,t>>>=7,r.buf[r.pos++]=127&t|128,t>>>=7,r.buf[r.pos++]=127&t|128,t>>>=7,r.buf[r.pos]=127&t;}(r,0,e),function(t,e){var r=(7&t)<<4;if(e.buf[e.pos++]|=r|((t>>>=3)?128:0),!t)return;if(e.buf[e.pos++]=127&t|((t>>>=7)?128:0),!t)return;if(e.buf[e.pos++]=127&t|((t>>>=7)?128:0),!t)return;if(e.buf[e.pos++]=127&t|((t>>>=7)?128:0),!t)return;if(e.buf[e.pos++]=127&t|((t>>>=7)?128:0),!t)return;e.buf[e.pos++]=127&t;}(n,e);}(t,this):(this.realloc(4),this.buf[this.pos++]=127&t|(t>127?128:0),t<=127||(this.buf[this.pos++]=127&(t>>>=7)|(t>127?128:0),t<=127||(this.buf[this.pos++]=127&(t>>>=7)|(t>127?128:0),t<=127||(this.buf[this.pos++]=t>>>7&127))));},writeSVarint:function(t){this.writeVarint(t<0?2*-t-1:2*t);},writeBoolean:function(t){this.writeVarint(Boolean(t));},writeString:function(t){t=String(t),this.realloc(4*t.length),this.pos++;var e=this.pos;this.pos=function(t,e,r){for(var n,i,a=0;a<e.length;a++){if((n=e.charCodeAt(a))>55295&&n<57344){if(!i){n>56319||a+1===e.length?(t[r++]=239,t[r++]=191,t[r++]=189):i=n;continue}if(n<56320){t[r++]=239,t[r++]=191,t[r++]=189,i=n;continue}n=i-55296<<10|n-56320|65536,i=null;}else i&&(t[r++]=239,t[r++]=191,t[r++]=189,i=null);n<128?t[r++]=n:(n<2048?t[r++]=n>>6|192:(n<65536?t[r++]=n>>12|224:(t[r++]=n>>18|240,t[r++]=n>>12&63|128),t[r++]=n>>6&63|128),t[r++]=63&n|128);}return r}(this.buf,t,this.pos);var r=this.pos-e;r>=128&&cu(e,r,this),this.pos=e-1,this.writeVarint(r),this.pos+=r;},writeFloat:function(t){this.realloc(4),ou(this.buf,t,this.pos,!0,23,4),this.pos+=4;},writeDouble:function(t){this.realloc(8),ou(this.buf,t,this.pos,!0,52,8),this.pos+=8;},writeBytes:function(t){var e=t.length;this.writeVarint(e),this.realloc(e);for(var r=0;r<e;r++)this.buf[this.pos++]=t[r];},writeRawMessage:function(t,e){this.pos++;var r=this.pos;t(e,this);var n=this.pos-r;n>=128&&cu(r,n,this),this.pos=r-1,this.writeVarint(n),this.pos+=n;},writeMessage:function(t,e,r){this.writeTag(t,uu.Bytes),this.writeRawMessage(e,r);},writePackedVarint:function(t,e){e.length&&this.writeMessage(t,hu,e);},writePackedSVarint:function(t,e){e.length&&this.writeMessage(t,fu,e);},writePackedBoolean:function(t,e){e.length&&this.writeMessage(t,mu,e);},writePackedFloat:function(t,e){e.length&&this.writeMessage(t,yu,e);},writePackedDouble:function(t,e){e.length&&this.writeMessage(t,du,e);},writePackedFixed32:function(t,e){e.length&&this.writeMessage(t,vu,e);},writePackedSFixed32:function(t,e){e.length&&this.writeMessage(t,gu,e);},writePackedFixed64:function(t,e){e.length&&this.writeMessage(t,xu,e);},writePackedSFixed64:function(t,e){e.length&&this.writeMessage(t,bu,e);},writeBytesField:function(t,e){this.writeTag(t,uu.Bytes),this.writeBytes(e);},writeFixed32Field:function(t,e){this.writeTag(t,uu.Fixed32),this.writeFixed32(e);},writeSFixed32Field:function(t,e){this.writeTag(t,uu.Fixed32),this.writeSFixed32(e);},writeFixed64Field:function(t,e){this.writeTag(t,uu.Fixed64),this.writeFixed64(e);},writeSFixed64Field:function(t,e){this.writeTag(t,uu.Fixed64),this.writeSFixed64(e);},writeVarintField:function(t,e){this.writeTag(t,uu.Varint),this.writeVarint(e);},writeSVarintField:function(t,e){this.writeTag(t,uu.Varint),this.writeSVarint(e);},writeStringField:function(t,e){this.writeTag(t,uu.Bytes),this.writeString(e);},writeFloatField:function(t,e){this.writeTag(t,uu.Fixed32),this.writeFloat(e);},writeDoubleField:function(t,e){this.writeTag(t,uu.Fixed64),this.writeDouble(e);},writeBooleanField:function(t,e){this.writeVarintField(t,Boolean(e));}};var ku=3;function Su(t,e,r){1===t&&r.readMessage(zu,e);}function zu(t,e,r){if(3===t){var n=r.readMessage(Iu,{}),i=n.id,a=n.bitmap,o=n.width,s=n.height,u=n.left,l=n.top,p=n.advance;e.push({id:i,bitmap:new Da({width:o+2*ku,height:s+2*ku},a),metrics:{width:o,height:s,left:u,top:l,advance:p}});}}function Iu(t,e,r){1===t?e.id=r.readVarint():2===t?e.bitmap=r.readBytes():3===t?e.width=r.readVarint():4===t?e.height=r.readVarint():5===t?e.left=r.readSVarint():6===t?e.top=r.readSVarint():7===t&&(e.advance=r.readVarint());}var Cu=ku,Bu=function(t){var e=this;this._callback=t,this._triggered=!1,"undefined"!=typeof MessageChannel&&(this._channel=new MessageChannel,this._channel.port2.onmessage=function(){e._triggered=!1,e._callback();});};Bu.prototype.trigger=function(){var t=this;this._triggered||(this._triggered=!0,this._channel?this._channel.port1.postMessage(!0):setTimeout((function(){t._triggered=!1,t._callback();}),0));};var Eu=function(t,e,r){this.target=t,this.parent=e,this.mapId=r,this.callbacks={},this.tasks={},this.taskQueue=[],this.cancelCallbacks={},m(["receive","process"],this),this.invoker=new Bu(this.process),this.target.addEventListener("message",this.receive,!1);};function Mu(t,e,r){var n=2*Math.PI*6378137/256/Math.pow(2,r);return [t*n-2*Math.PI*6378137/2,e*n-2*Math.PI*6378137/2]}Eu.prototype.send=function(t,e,r,n){var i=this,a=Math.round(1e18*Math.random()).toString(36).substring(0,10);r&&(this.callbacks[a]=r);var o=[];return this.target.postMessage({id:a,type:t,hasCallback:!!r,targetMapId:n,sourceMapId:this.mapId,data:_n(e,o)},o),{cancel:function(){r&&delete i.callbacks[a],i.target.postMessage({id:a,type:"<cancel>",targetMapId:n,sourceMapId:i.mapId});}}},Eu.prototype.receive=function(t){var e=t.data,r=e.id;if(r&&(!e.targetMapId||this.mapId===e.targetMapId))if("<cancel>"===e.type){delete this.tasks[r];var n=this.cancelCallbacks[r];delete this.cancelCallbacks[r],n&&n();}else this.tasks[r]=e,this.taskQueue.push(r),this.invoker.trigger();},Eu.prototype.process=function(){var t=this;if(this.taskQueue.length){var e=this.taskQueue.shift(),r=this.tasks[e];if(delete this.tasks[e],this.taskQueue.length&&this.invoker.trigger(),r)if("<response>"===r.type){var n=this.callbacks[e];delete this.callbacks[e],n&&(r.error?n(wn(r.error)):n(null,wn(r.data)));}else{var i=!1,a=r.hasCallback?function(r,n){i=!0,delete t.cancelCallbacks[e];var a=[];t.target.postMessage({id:e,type:"<response>",sourceMapId:t.mapId,error:r?_n(r):null,data:_n(n,a)},a);}:function(t){i=!0;},o=null,s=wn(r.data);if(this.parent[r.type])o=this.parent[r.type](r.sourceMapId,s,a);else if(this.parent.getWorkerSource){var u=r.type.split(".");o=this.parent.getWorkerSource(r.sourceMapId,u[0],s.source)[u[1]](s,a);}else a(new Error("Could not find function "+r.type));!i&&o&&o.cancel&&(this.cancelCallbacks[e]=o.cancel);}}},Eu.prototype.remove=function(){this.target.removeEventListener("message",this.receive,!1);};var Pu=function(t,e){t&&(e?this.setSouthWest(t).setNorthEast(e):4===t.length?this.setSouthWest([t[0],t[1]]).setNorthEast([t[2],t[3]]):this.setSouthWest(t[0]).setNorthEast(t[1]));};Pu.prototype.setNorthEast=function(t){return this._ne=t instanceof Tu?new Tu(t.lng,t.lat):Tu.convert(t),this},Pu.prototype.setSouthWest=function(t){return this._sw=t instanceof Tu?new Tu(t.lng,t.lat):Tu.convert(t),this},Pu.prototype.extend=function(t){var e,r,n=this._sw,i=this._ne;if(t instanceof Tu)e=t,r=t;else{if(!(t instanceof Pu))return Array.isArray(t)?t.every(Array.isArray)?this.extend(Pu.convert(t)):this.extend(Tu.convert(t)):this;if(e=t._sw,r=t._ne,!e||!r)return this}return n||i?(n.lng=Math.min(e.lng,n.lng),n.lat=Math.min(e.lat,n.lat),i.lng=Math.max(r.lng,i.lng),i.lat=Math.max(r.lat,i.lat)):(this._sw=new Tu(e.lng,e.lat),this._ne=new Tu(r.lng,r.lat)),this},Pu.prototype.getCenter=function(){return new Tu((this._sw.lng+this._ne.lng)/2,(this._sw.lat+this._ne.lat)/2)},Pu.prototype.getSouthWest=function(){return this._sw},Pu.prototype.getNorthEast=function(){return this._ne},Pu.prototype.getNorthWest=function(){return new Tu(this.getWest(),this.getNorth())},Pu.prototype.getSouthEast=function(){return new Tu(this.getEast(),this.getSouth())},Pu.prototype.getWest=function(){return this._sw.lng},Pu.prototype.getSouth=function(){return this._sw.lat},Pu.prototype.getEast=function(){return this._ne.lng},Pu.prototype.getNorth=function(){return this._ne.lat},Pu.prototype.toArray=function(){return [this._sw.toArray(),this._ne.toArray()]},Pu.prototype.toString=function(){return "LngLatBounds("+this._sw.toString()+", "+this._ne.toString()+")"},Pu.prototype.isEmpty=function(){return !(this._sw&&this._ne)},Pu.convert=function(t){return !t||t instanceof Pu?t:new Pu(t)};var Tu=function(t,e){if(isNaN(t)||isNaN(e))throw new Error("Invalid LngLat object: ("+t+", "+e+")");if(this.lng=+t,this.lat=+e,this.lat>90||this.lat<-90)throw new Error("Invalid LngLat latitude value: must be between -90 and 90")};Tu.prototype.wrap=function(){return new Tu(p(this.lng,-180,180),this.lat)},Tu.prototype.toArray=function(){return [this.lng,this.lat]},Tu.prototype.toString=function(){return "LngLat("+this.lng+", "+this.lat+")"},Tu.prototype.toBounds=function(t){void 0===t&&(t=0);var e=360*t/40075017,r=e/Math.cos(Math.PI/180*this.lat);return new Pu(new Tu(this.lng-r,this.lat-e),new Tu(this.lng+r,this.lat+e))},Tu.convert=function(t){if(t instanceof Tu)return t;if(Array.isArray(t)&&(2===t.length||3===t.length))return new Tu(Number(t[0]),Number(t[1]));if(!Array.isArray(t)&&"object"==typeof t&&null!==t)return new Tu(Number("lng"in t?t.lng:t.lon),Number(t.lat));throw new Error("`LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]")};var Vu=2*Math.PI*6378137;function Fu(t){return Vu*Math.cos(t*Math.PI/180)}function Ou(t){return (180+t)/360}function Lu(t){return (180-180/Math.PI*Math.log(Math.tan(Math.PI/4+t*Math.PI/360)))/360}function Du(t,e){return t/Fu(e)}function Uu(t){var e=180-360*t;return 360/Math.PI*Math.atan(Math.exp(e*Math.PI/180))-90}var Ru=function(t,e,r){void 0===r&&(r=0),this.x=+t,this.y=+e,this.z=+r;};Ru.fromLngLat=function(t,e){void 0===e&&(e=0);var r=Tu.convert(t);return new Ru(Ou(r.lng),Lu(r.lat),Du(e,r.lat))},Ru.prototype.toLngLat=function(){return new Tu(360*this.x-180,Uu(this.y))},Ru.prototype.toAltitude=function(){return t=this.z,e=this.y,t*Fu(Uu(e));var t,e;},Ru.prototype.meterInMercatorCoordinateUnits=function(){return 1/Vu*(t=Uu(this.y),1/Math.cos(t*Math.PI/180));var t;};var ju=function(t,e,r){this.z=t,this.x=e,this.y=r,this.key=Ku(0,t,e,r);};ju.prototype.equals=function(t){return this.z===t.z&&this.x===t.x&&this.y===t.y},ju.prototype.url=function(t,e){var r,n,i,a,o,s=(r=this.x,n=this.y,i=this.z,a=Mu(256*r,256*(n=Math.pow(2,i)-n-1),i),o=Mu(256*(r+1),256*(n+1),i),a[0]+","+a[1]+","+o[0]+","+o[1]),u=function(t,e,r){for(var n,i="",a=t;a>0;a--)i+=(e&(n=1<<a-1)?1:0)+(r&n?2:0);return i}(this.z,this.x,this.y);return t[(this.x+this.y)%t.length].replace("{prefix}",(this.x%16).toString(16)+(this.y%16).toString(16)).replace("{z}",String(this.z)).replace("{x}",String(this.x)).replace("{y}",String("tms"===e?Math.pow(2,this.z)-this.y-1:this.y)).replace("{quadkey}",u).replace("{bbox-epsg-3857}",s)},ju.prototype.getTilePoint=function(t){var e=Math.pow(2,this.z);return new i((t.x*e-this.x)*oa,(t.y*e-this.y)*oa)};var qu=function(t,e){this.wrap=t,this.canonical=e,this.key=Ku(t,e.z,e.x,e.y);},Nu=function(t,e,r,n,i){this.overscaledZ=t,this.wrap=e,this.canonical=new ju(r,+n,+i),this.key=Ku(e,t,n,i);};function Ku(t,e,r,n){(t*=2)<0&&(t=-1*t-1);var i=1<<e;return 32*(i*i*t+i*n+r)+e}Nu.prototype.equals=function(t){return this.overscaledZ===t.overscaledZ&&this.wrap===t.wrap&&this.canonical.equals(t.canonical)},Nu.prototype.scaledTo=function(t){var e=this.canonical.z-t;return t>this.canonical.z?new Nu(t,this.wrap,this.canonical.z,this.canonical.x,this.canonical.y):new Nu(t,this.wrap,t,this.canonical.x>>e,this.canonical.y>>e)},Nu.prototype.isChildOf=function(t){if(t.wrap!==this.wrap)return !1;var e=this.canonical.z-t.canonical.z;return 0===t.overscaledZ||t.overscaledZ<this.overscaledZ&&t.canonical.x===this.canonical.x>>e&&t.canonical.y===this.canonical.y>>e},Nu.prototype.children=function(t){if(this.overscaledZ>=t)return [new Nu(this.overscaledZ+1,this.wrap,this.canonical.z,this.canonical.x,this.canonical.y)];var e=this.canonical.z+1,r=2*this.canonical.x,n=2*this.canonical.y;return [new Nu(e,this.wrap,e,r,n),new Nu(e,this.wrap,e,r+1,n),new Nu(e,this.wrap,e,r,n+1),new Nu(e,this.wrap,e,r+1,n+1)]},Nu.prototype.isLessThan=function(t){return this.wrap<t.wrap||!(this.wrap>t.wrap)&&(this.overscaledZ<t.overscaledZ||!(this.overscaledZ>t.overscaledZ)&&(this.canonical.x<t.canonical.x||!(this.canonical.x>t.canonical.x)&&this.canonical.y<t.canonical.y))},Nu.prototype.wrapped=function(){return new Nu(this.overscaledZ,0,this.canonical.z,this.canonical.x,this.canonical.y)},Nu.prototype.unwrapTo=function(t){return new Nu(this.overscaledZ,t,this.canonical.z,this.canonical.x,this.canonical.y)},Nu.prototype.overscaleFactor=function(){return Math.pow(2,this.overscaledZ-this.canonical.z)},Nu.prototype.toUnwrapped=function(){return new qu(this.wrap,this.canonical)},Nu.prototype.toString=function(){return this.overscaledZ+"/"+this.canonical.x+"/"+this.canonical.y},Nu.prototype.getTilePoint=function(t){return this.canonical.getTilePoint(new Ru(t.x-this.wrap,t.y))},xn("CanonicalTileID",ju),xn("OverscaledTileID",Nu,{omit:["posMatrix"]});var Zu=function(t,e,r){if(this.uid=t,e.height!==e.width)throw new RangeError("DEM tiles must be square");if(r&&"mapbox"!==r&&"terrarium"!==r)return w('"'+r+'" is not a valid encoding type. Valid types include "mapbox" and "terrarium".');this.stride=e.height;var n=this.dim=e.height-2;this.data=new Uint32Array(e.data.buffer),this.encoding=r||"mapbox";for(var i=0;i<n;i++)this.data[this._idx(-1,i)]=this.data[this._idx(0,i)],this.data[this._idx(n,i)]=this.data[this._idx(n-1,i)],this.data[this._idx(i,-1)]=this.data[this._idx(i,0)],this.data[this._idx(i,n)]=this.data[this._idx(i,n-1)];this.data[this._idx(-1,-1)]=this.data[this._idx(0,0)],this.data[this._idx(n,-1)]=this.data[this._idx(n-1,0)],this.data[this._idx(-1,n)]=this.data[this._idx(0,n-1)],this.data[this._idx(n,n)]=this.data[this._idx(n-1,n-1)];};Zu.prototype.get=function(t,e){var r=new Uint8Array(this.data.buffer),n=4*this._idx(t,e);return ("terrarium"===this.encoding?this._unpackTerrarium:this._unpackMapbox)(r[n],r[n+1],r[n+2])},Zu.prototype.getUnpackVector=function(){return "terrarium"===this.encoding?[256,1,1/256,32768]:[6553.6,25.6,.1,1e4]},Zu.prototype._idx=function(t,e){if(t<-1||t>=this.dim+1||e<-1||e>=this.dim+1)throw new RangeError("out of range source coordinates for DEM data");return (e+1)*this.stride+(t+1)},Zu.prototype._unpackMapbox=function(t,e,r){return (256*t*256+256*e+r)/10-1e4},Zu.prototype._unpackTerrarium=function(t,e,r){return 256*t+e+r/256-32768},Zu.prototype.getPixels=function(){return new Ua({width:this.stride,height:this.stride},new Uint8Array(this.data.buffer))},Zu.prototype.backfillBorder=function(t,e,r){if(this.dim!==t.dim)throw new Error("dem dimension mismatch");var n=e*this.dim,i=e*this.dim+this.dim,a=r*this.dim,o=r*this.dim+this.dim;switch(e){case-1:n=i-1;break;case 1:i=n+1;}switch(r){case-1:a=o-1;break;case 1:o=a+1;}for(var s=-e*this.dim,u=-r*this.dim,l=a;l<o;l++)for(var p=n;p<i;p++)this.data[this._idx(p,l)]=t.data[this._idx(p+s,l+u)];},xn("DEMData",Zu);var Xu=ei([{name:"a_pos",type:"Int16",components:2},{name:"a_texture_pos",type:"Int16",components:2}]);var Gu=function(t){this._stringToNumber={},this._numberToString=[];for(var e=0;e<t.length;e++){var r=t[e];this._stringToNumber[r]=e,this._numberToString[e]=r;}};Gu.prototype.encode=function(t){return this._stringToNumber[t]},Gu.prototype.decode=function(t){return this._numberToString[t]};var Ju=function(t,e,r,n){this.type="Feature",this._vectorTileFeature=t,t._z=e,t._x=r,t._y=n,this.properties=t.properties,null!=t.id&&(this.id=t.id);},Hu={geometry:{configurable:!0}};Hu.geometry.get=function(){return void 0===this._geometry&&(this._geometry=this._vectorTileFeature.toGeoJSON(this._vectorTileFeature._x,this._vectorTileFeature._y,this._vectorTileFeature._z).geometry),this._geometry},Hu.geometry.set=function(t){this._geometry=t;},Ju.prototype.toJSON=function(){var t={geometry:this.geometry};for(var e in this)"_geometry"!==e&&"_vectorTileFeature"!==e&&(t[e]=this[e]);return t},Object.defineProperties(Ju.prototype,Hu);var Yu=function(){this.state={},this.stateChanges={},this.deletedStates={};};Yu.prototype.updateState=function(t,e,r){var n=String(e);if(this.stateChanges[t]=this.stateChanges[t]||{},this.stateChanges[t][n]=this.stateChanges[t][n]||{},c(this.stateChanges[t][n],r),null===this.deletedStates[t])for(var i in this.deletedStates[t]={},this.state[t])i!==n&&(this.deletedStates[t][i]=null);else if(this.deletedStates[t]&&null===this.deletedStates[t][n])for(var a in this.deletedStates[t][n]={},this.state[t][n])r[a]||(this.deletedStates[t][n][a]=null);else for(var o in r){this.deletedStates[t]&&this.deletedStates[t][n]&&null===this.deletedStates[t][n][o]&&delete this.deletedStates[t][n][o];}},Yu.prototype.removeFeatureState=function(t,e,r){if(!(null===this.deletedStates[t])){var n=String(e);if(this.deletedStates[t]=this.deletedStates[t]||{},r&&void 0!==e&&e>=0)null!==this.deletedStates[t][n]&&(this.deletedStates[t][n]=this.deletedStates[t][n]||{},this.deletedStates[t][n][r]=null);else if(void 0!==e&&e>=0){if(this.stateChanges[t]&&this.stateChanges[t][n])for(r in this.deletedStates[t][n]={},this.stateChanges[t][n])this.deletedStates[t][n][r]=null;else this.deletedStates[t][n]=null;}else this.deletedStates[t]=null;}},Yu.prototype.getState=function(t,e){var r=String(e),n=this.state[t]||{},i=this.stateChanges[t]||{},a=c({},n[r],i[r]);if(null===this.deletedStates[t])return {};if(this.deletedStates[t]){var o=this.deletedStates[t][e];if(null===o)return {};for(var s in o)delete a[s];}return a},Yu.prototype.initializeTileState=function(t,e){t.setFeatureState(this.state,e);},Yu.prototype.coalesceChanges=function(t,e){var r={};for(var n in this.stateChanges){this.state[n]=this.state[n]||{};var i={};for(var a in this.stateChanges[n])this.state[n][a]||(this.state[n][a]={}),c(this.state[n][a],this.stateChanges[n][a]),i[a]=this.state[n][a];r[n]=i;}for(var o in this.deletedStates){this.state[o]=this.state[o]||{};var s={};if(null===this.deletedStates[o])for(var u in this.state[o])s[u]={},this.state[o][u]={};else for(var l in this.deletedStates[o]){if(null===this.deletedStates[o][l])this.state[o][l]={};else for(var p=0,h=Object.keys(this.deletedStates[o][l]);p<h.length;p+=1){var f=h[p];delete this.state[o][l][f];}s[l]=this.state[o][l];}r[o]=r[o]||{},c(r[o],s);}if(this.stateChanges={},this.deletedStates={},0!==Object.keys(r).length)for(var y in t){t[y].setFeatureState(r,e);}};var $u=function(t,e,r){this.tileID=t,this.x=t.canonical.x,this.y=t.canonical.y,this.z=t.canonical.z,this.grid=e||new yn(oa,16,0),this.grid3D=new yn(oa,16,0),this.featureIndexArray=r||new Fi;};function Wu(t){for(var e=1/0,r=1/0,n=-1/0,i=-1/0,a=0,o=t;a<o.length;a+=1){var s=o[a];e=Math.min(e,s.x),r=Math.min(r,s.y),n=Math.max(n,s.x),i=Math.max(i,s.y);}return {minX:e,minY:r,maxX:n,maxY:i}}function Qu(t,e){return e-t}$u.prototype.insert=function(t,e,r,n,i,a){var o=this.featureIndexArray.length;this.featureIndexArray.emplaceBack(r,n,i);for(var s=a?this.grid3D:this.grid,u=0;u<e.length;u++){for(var l=e[u],p=[1/0,1/0,-1/0,-1/0],c=0;c<l.length;c++){var h=l[c];p[0]=Math.min(p[0],h.x),p[1]=Math.min(p[1],h.y),p[2]=Math.max(p[2],h.x),p[3]=Math.max(p[3],h.y);}p[0]<oa&&p[1]<oa&&p[2]>=0&&p[3]>=0&&s.insert(o,p[0],p[1],p[2],p[3]);}},$u.prototype.loadVTLayers=function(){return this.vtLayers||(this.vtLayers=new jo.VectorTile(new su(this.rawTileData)).layers,this.sourceLayerCoder=new Gu(this.vtLayers?Object.keys(this.vtLayers).sort():["_geojsonTileLayer"])),this.vtLayers},$u.prototype.query=function(t,e,r){var n=this;this.loadVTLayers();for(var a=t.params||{},o=oa/t.tileSize/t.scale,s=jr(a.filter),u=t.queryGeometry,l=t.queryPadding*o,p=Wu(u),c=this.grid.query(p.minX-l,p.minY-l,p.maxX+l,p.maxY+l),h=Wu(t.cameraQueryGeometry),f=this.grid3D.query(h.minX-l,h.minY-l,h.maxX+l,h.maxY+l,(function(e,r,n,a){return function(t,e,r,n,a){for(var o=0,s=t;o<s.length;o+=1){var u=s[o];if(e<=u.x&&r<=u.y&&n>=u.x&&a>=u.y)return !0}var l=[new i(e,r),new i(e,a),new i(n,a),new i(n,r)];if(t.length>2)for(var p=0,c=l;p<c.length;p+=1){if(_a(t,c[p]))return !0}for(var h=0;h<t.length-1;h++){if(wa(t[h],t[h+1],l))return !0}return !1}(t.cameraQueryGeometry,e-l,r-l,n+l,a+l)})),y=0,d=f;y<d.length;y+=1){var m=d[y];c.push(m);}c.sort(Qu);for(var v,g={},x=function(i){var l=c[i];if(l!==v){v=l;var p=n.featureIndexArray.get(l),h=null;n.loadMatchingFeature(g,p.bucketIndex,p.sourceLayerIndex,p.featureIndex,s,a.layers,e,(function(e,i){h||(h=la(e));var a={};return e.id&&(a=r.getState(i.sourceLayer||"_geojsonTileLayer",e.id)),i.queryIntersectsFeature(u,e,a,h,n.z,t.transform,o,t.pixelPosMatrix)}));}},b=0;b<c.length;b++)x(b);return g},$u.prototype.loadMatchingFeature=function(t,e,r,n,i,a,o,s){var u=this.bucketLayerIDs[e];if(!a||function(t,e){for(var r=0;r<t.length;r++)if(e.indexOf(t[r])>=0)return !0;return !1}(a,u)){var l=this.sourceLayerCoder.decode(r),p=this.vtLayers[l].feature(n);if(i(new On(this.tileID.overscaledZ),p))for(var c=0;c<u.length;c++){var h=u[c];if(!(a&&a.indexOf(h)<0)){var f=o[h];if(f){var y=!s||s(p,f);if(y){var d=new Ju(p,this.z,this.x,this.y);d.layer=f.serialize();var m=t[h];void 0===m&&(m=t[h]=[]),m.push({featureIndex:n,feature:d,intersectionZ:y});}}}}}},$u.prototype.lookupSymbolFeatures=function(t,e,r,n,i,a){var o={};this.loadVTLayers();for(var s=jr(n),u=0,l=t;u<l.length;u+=1){var p=l[u];this.loadMatchingFeature(o,e,r,p,s,i,a);}return o},$u.prototype.hasLayer=function(t){for(var e=0,r=this.bucketLayerIDs;e<r.length;e+=1)for(var n=0,i=r[e];n<i.length;n+=1){if(t===i[n])return !0}return !1},xn("FeatureIndex",$u,{omit:["rawTileData","sourceLayerCoder"]});var tl=function(t,e){this.tileID=t,this.uid=f(),this.uses=0,this.tileSize=e,this.buckets={},this.expirationTime=null,this.queryPadding=0,this.hasSymbolBuckets=!1,this.expiredRequestCount=0,this.state="loading";};tl.prototype.registerFadeDuration=function(t){var e=t+this.timeAdded;e<V.now()||this.fadeEndTime&&e<this.fadeEndTime||(this.fadeEndTime=e);},tl.prototype.wasRequested=function(){return "errored"===this.state||"loaded"===this.state||"reloading"===this.state},tl.prototype.loadVectorData=function(t,e,r){if(this.hasData()&&this.unloadVectorData(),this.state="loaded",t){for(var n in t.featureIndex&&(this.latestFeatureIndex=t.featureIndex,t.rawTileData?(this.latestRawTileData=t.rawTileData,this.latestFeatureIndex.rawTileData=t.rawTileData):this.latestRawTileData&&(this.latestFeatureIndex.rawTileData=this.latestRawTileData)),this.collisionBoxArray=t.collisionBoxArray,this.buckets=function(t,e){var r={};if(!e)return r;for(var n=function(){var t=a[i],n=t.layerIds.map((function(t){return e.getLayer(t)})).filter(Boolean);if(0!==n.length){t.layers=n,t.stateDependentLayerIds&&(t.stateDependentLayers=t.stateDependentLayerIds.map((function(t){return n.filter((function(e){return e.id===t}))[0]})));for(var o=0,s=n;o<s.length;o+=1){var u=s[o];r[u.id]=t;}}},i=0,a=t;i<a.length;i+=1)n();return r}(t.buckets,e.style),this.hasSymbolBuckets=!1,this.buckets){var i=this.buckets[n];if(i instanceof Us){if(this.hasSymbolBuckets=!0,!r)break;i.justReloaded=!0;}}for(var a in this.queryPadding=0,this.buckets){var o=this.buckets[a];this.queryPadding=Math.max(this.queryPadding,e.style.getLayer(a).queryRadius(o));}t.imageAtlas&&(this.imageAtlas=t.imageAtlas),t.glyphAtlasImage&&(this.glyphAtlasImage=t.glyphAtlasImage);}else this.collisionBoxArray=new Si;},tl.prototype.unloadVectorData=function(){for(var t in this.buckets)this.buckets[t].destroy();this.buckets={},this.imageAtlasTexture&&this.imageAtlasTexture.destroy(),this.imageAtlas&&(this.imageAtlas=null),this.glyphAtlasTexture&&this.glyphAtlasTexture.destroy(),this.latestFeatureIndex=null,this.state="unloaded";},tl.prototype.unloadDEMData=function(){this.dem=null,this.neighboringTiles=null,this.state="unloaded";},tl.prototype.getBucket=function(t){return this.buckets[t.id]},tl.prototype.upload=function(t){for(var e in this.buckets){var r=this.buckets[e];r.uploadPending()&&r.upload(t);}var n=t.gl;this.imageAtlas&&!this.imageAtlas.uploaded&&(this.imageAtlasTexture=new iu(t,this.imageAtlas.image,n.RGBA),this.imageAtlas.uploaded=!0),this.glyphAtlasImage&&(this.glyphAtlasTexture=new iu(t,this.glyphAtlasImage,n.ALPHA),this.glyphAtlasImage=null);},tl.prototype.prepare=function(t){this.imageAtlas&&this.imageAtlas.patchUpdatedImages(t,this.imageAtlasTexture);},tl.prototype.queryRenderedFeatures=function(t,e,r,n,i,a,o,s,u){return this.latestFeatureIndex&&this.latestFeatureIndex.rawTileData?this.latestFeatureIndex.query({queryGeometry:r,cameraQueryGeometry:n,scale:i,tileSize:this.tileSize,pixelPosMatrix:u,transform:o,params:a,queryPadding:this.queryPadding*s},t,e):{}},tl.prototype.querySourceFeatures=function(t,e){if(this.latestFeatureIndex&&this.latestFeatureIndex.rawTileData){var r=this.latestFeatureIndex.loadVTLayers(),n=e?e.sourceLayer:"",i=r._geojsonTileLayer||r[n];if(i)for(var a=jr(e&&e.filter),o=this.tileID.canonical,s=o.z,u=o.x,l=o.y,p={z:s,x:u,y:l},c=0;c<i.length;c++){var h=i.feature(c);if(a(new On(this.tileID.overscaledZ),h)){var f=new Ju(h,s,u,l);f.tile=p,t.push(f);}}}},tl.prototype.clearMask=function(){this.segments&&(this.segments.destroy(),delete this.segments),this.maskedBoundsBuffer&&(this.maskedBoundsBuffer.destroy(),delete this.maskedBoundsBuffer),this.maskedIndexBuffer&&(this.maskedIndexBuffer.destroy(),delete this.maskedIndexBuffer);},tl.prototype.setMask=function(t,e){if(!o(this.mask,t)&&(this.mask=t,this.clearMask(),!o(t,{0:!0}))){var r=new ii,n=new xi;this.segments=new Li,this.segments.prepareSegment(0,r,n);for(var a=Object.keys(t),s=0;s<a.length;s++){var u=t[+a[s]],l=oa>>u.z,p=new i(u.x*l,u.y*l),c=new i(p.x+l,p.y+l),h=this.segments.prepareSegment(4,r,n);r.emplaceBack(p.x,p.y,p.x,p.y),r.emplaceBack(c.x,p.y,c.x,p.y),r.emplaceBack(p.x,c.y,p.x,c.y),r.emplaceBack(c.x,c.y,c.x,c.y);var f=h.vertexLength;n.emplaceBack(f,f+1,f+2),n.emplaceBack(f+1,f+2,f+3),h.vertexLength+=4,h.primitiveLength+=2;}this.maskedBoundsBuffer=e.createVertexBuffer(r,Xu.members),this.maskedIndexBuffer=e.createIndexBuffer(n);}},tl.prototype.hasData=function(){return "loaded"===this.state||"reloading"===this.state||"expired"===this.state},tl.prototype.patternsLoaded=function(){return this.imageAtlas&&!!Object.keys(this.imageAtlas.patternPositions).length},tl.prototype.setExpiryData=function(t){var e=this.expirationTime;if(t.cacheControl){var r=S(t.cacheControl);r["max-age"]&&(this.expirationTime=Date.now()+1e3*r["max-age"]);}else t.expires&&(this.expirationTime=new Date(t.expires).getTime());if(this.expirationTime){var n=Date.now(),i=!1;if(this.expirationTime>n)i=!1;else if(e)if(this.expirationTime<e)i=!0;else{var a=this.expirationTime-e;a?this.expirationTime=n+Math.max(a,3e4):i=!0;}else i=!0;i?(this.expiredRequestCount++,this.state="expired"):this.expiredRequestCount=0;}},tl.prototype.getExpiryTimeout=function(){if(this.expirationTime)return this.expiredRequestCount?1e3*(1<<Math.min(this.expiredRequestCount-1,31)):Math.min(this.expirationTime-(new Date).getTime(),Math.pow(2,31)-1)},tl.prototype.setFeatureState=function(t,e){if(this.latestFeatureIndex&&this.latestFeatureIndex.rawTileData&&0!==Object.keys(t).length){var r=this.latestFeatureIndex.loadVTLayers();for(var n in this.buckets){var i=this.buckets[n],a=i.layers[0].sourceLayer||"_geojsonTileLayer",o=r[a],s=t[a];o&&s&&0!==Object.keys(s).length&&(i.update(s,o,this.imageAtlas&&this.imageAtlas.patternPositions||{}),e&&e.style&&(this.queryPadding=Math.max(this.queryPadding,e.style.getLayer(n).queryRadius(i))));}}},tl.prototype.holdingForFade=function(){return void 0!==this.symbolFadeHoldUntil},tl.prototype.symbolFadeFinished=function(){return !this.symbolFadeHoldUntil||this.symbolFadeHoldUntil<V.now()},tl.prototype.clearFadeHold=function(){this.symbolFadeHoldUntil=void 0;},tl.prototype.setHoldDuration=function(t){this.symbolFadeHoldUntil=V.now()+t;};function el(t,e,r,n,i){if(void 0===e.segment)return !0;for(var a=e,o=e.segment+1,s=0;s>-r/2;){if(--o<0)return !1;s-=t[o].dist(a),a=t[o];}s+=t[o].dist(t[o+1]),o++;for(var u=[],l=0;s<r/2;){var p=t[o-1],c=t[o],h=t[o+1];if(!h)return !1;var f=p.angleTo(c)-c.angleTo(h);for(f=Math.abs((f+3*Math.PI)%(2*Math.PI)-Math.PI),u.push({distance:s,angleDelta:f}),l+=f;s-u[0].distance>n;)l-=u.shift().angleDelta;if(l>i)return !1;o++,s+=c.dist(h);}return !0}function rl(t){for(var e=0,r=0;r<t.length-1;r++)e+=t[r].dist(t[r+1]);return e}function nl(t,e,r){return t?.6*e*r:0}function il(t,e){return Math.max(t?t.right-t.left:0,e?e.right-e.left:0)}function al(t,e,r,n,i,a){for(var o=nl(r,i,a),s=il(r,n)*a,u=0,l=rl(t)/2,p=0;p<t.length-1;p++){var c=t[p],h=t[p+1],f=c.dist(h);if(u+f>l){var y=(l-u)/f,d=Ae(c.x,h.x,y),m=Ae(c.y,h.y,y),v=new Is(d,m,h.angleTo(c),p);return v._round(),!o||el(t,v,s,o,e)?v:void 0}u+=f;}}function ol(t,e,r,n,i,a,o,s,u){var l=nl(n,a,o),p=il(n,i),c=p*o,h=0===t[0].x||t[0].x===u||0===t[0].y||t[0].y===u;return e-c<e/4&&(e=c+e/4),function t(e,r,n,i,a,o,s,u,l){var p=o/2;var c=rl(e);var h=0,f=r-n;var y=[];for(var d=0;d<e.length-1;d++){for(var m=e[d],v=e[d+1],g=m.dist(v),x=v.angleTo(m);f+n<h+g;){var b=((f+=n)-h)/g,_=Ae(m.x,v.x,b),w=Ae(m.y,v.y,b);if(_>=0&&_<l&&w>=0&&w<l&&f-p>=0&&f+p<=c){var A=new Is(_,w,x,d);A._round(),i&&!el(e,A,o,i,a)||y.push(A);}}h+=g;}u||y.length||s||(y=t(e,h/2,n,i,a,o,s,!0,l));return y}(t,h?e/2*s%e:(p/2+2*a)*o*s%e,e,l,r,c,h,!1,u)}var sl=function(t,e,r,n,a,o,s,u,l,p,c,h){var f=s.top*u-l,y=s.bottom*u+l,d=s.left*u-l,m=s.right*u+l;if(this.boxStartIndex=t.length,p){var v=y-f,g=m-d;v>0&&(v=Math.max(10*u,v),this._addLineCollisionCircles(t,e,r,r.segment,g,v,n,a,o,c));}else{if(h){var x=new i(d,f),b=new i(m,f),_=new i(d,y),w=new i(m,y),A=h*Math.PI/180;x._rotate(A),b._rotate(A),_._rotate(A),w._rotate(A),d=Math.min(x.x,b.x,_.x,w.x),m=Math.max(x.x,b.x,_.x,w.x),f=Math.min(x.y,b.y,_.y,w.y),y=Math.max(x.y,b.y,_.y,w.y);}t.emplaceBack(r.x,r.y,d,f,m,y,n,a,o,0,0);}this.boxEndIndex=t.length;};sl.prototype._addLineCollisionCircles=function(t,e,r,n,i,a,o,s,u,l){var p=a/2,c=Math.floor(i/p)||1,h=1+.4*Math.log(l)/Math.LN2,f=Math.floor(c*h/2),y=-a/2,d=r,m=n+1,v=y,g=-i/2,x=g-i/4;do{if(--m<0){if(v>g)return;m=0;break}v-=e[m].dist(d),d=e[m];}while(v>x);for(var b=e[m].dist(e[m+1]),_=-f;_<c+f;_++){var w=_*p,A=g+w;if(w<0&&(A+=w),w>i&&(A+=w-i),!(A<v)){for(;v+b<A;){if(v+=b,++m+1>=e.length)return;b=e[m].dist(e[m+1]);}var k=A-v,S=e[m],z=e[m+1].sub(S)._unit()._mult(k)._add(S)._round(),I=Math.abs(A-y)<p?0:.8*(A-y);t.emplaceBack(z.x,z.y,-a/2,-a/2,a/2,a/2,o,s,u,a/2,I);}}};var ul=function(t,e){if(void 0===t&&(t=[]),void 0===e&&(e=ll),this.data=t,this.length=this.data.length,this.compare=e,this.length>0)for(var r=(this.length>>1)-1;r>=0;r--)this._down(r);};function ll(t,e){return t<e?-1:t>e?1:0}function pl(t,e,r){void 0===e&&(e=1),void 0===r&&(r=!1);for(var n=1/0,a=1/0,o=-1/0,s=-1/0,u=t[0],l=0;l<u.length;l++){var p=u[l];(!l||p.x<n)&&(n=p.x),(!l||p.y<a)&&(a=p.y),(!l||p.x>o)&&(o=p.x),(!l||p.y>s)&&(s=p.y);}var c=o-n,h=s-a,f=Math.min(c,h),y=f/2,d=new ul([],cl);if(0===f)return new i(n,a);for(var m=n;m<o;m+=f)for(var v=a;v<s;v+=f)d.push(new hl(m+y,v+y,y,t));for(var g=function(t){for(var e=0,r=0,n=0,i=t[0],a=0,o=i.length,s=o-1;a<o;s=a++){var u=i[a],l=i[s],p=u.x*l.y-l.x*u.y;r+=(u.x+l.x)*p,n+=(u.y+l.y)*p,e+=3*p;}return new hl(r/e,n/e,0,t)}(t),x=d.length;d.length;){var b=d.pop();(b.d>g.d||!g.d)&&(g=b,r&&console.log("found best %d after %d probes",Math.round(1e4*b.d)/1e4,x)),b.max-g.d<=e||(y=b.h/2,d.push(new hl(b.p.x-y,b.p.y-y,y,t)),d.push(new hl(b.p.x+y,b.p.y-y,y,t)),d.push(new hl(b.p.x-y,b.p.y+y,y,t)),d.push(new hl(b.p.x+y,b.p.y+y,y,t)),x+=4);}return r&&(console.log("num probes: "+x),console.log("best distance: "+g.d)),g.p}function cl(t,e){return e.max-t.max}function hl(t,e,r,n){this.p=new i(t,e),this.h=r,this.d=function(t,e){for(var r=!1,n=1/0,i=0;i<e.length;i++)for(var a=e[i],o=0,s=a.length,u=s-1;o<s;u=o++){var l=a[o],p=a[u];l.y>t.y!=p.y>t.y&&t.x<(p.x-l.x)*(t.y-l.y)/(p.y-l.y)+l.x&&(r=!r),n=Math.min(n,xa(t,l,p));}return (r?1:-1)*Math.sqrt(n)}(this.p,n),this.max=this.d+this.h*Math.SQRT2;}ul.prototype.push=function(t){this.data.push(t),this.length++,this._up(this.length-1);},ul.prototype.pop=function(){if(0!==this.length){var t=this.data[0],e=this.data.pop();return this.length--,this.length>0&&(this.data[0]=e,this._down(0)),t}},ul.prototype.peek=function(){return this.data[0]},ul.prototype._up=function(t){for(var e=this.data,r=this.compare,n=e[t];t>0;){var i=t-1>>1,a=e[i];if(r(n,a)>=0)break;e[t]=a,t=i;}e[t]=n;},ul.prototype._down=function(t){for(var e=this.data,r=this.compare,n=this.length>>1,i=e[t];t<n;){var a=1+(t<<1),o=e[a],s=a+1;if(s<this.length&&r(e[s],o)<0&&(a=s,o=e[s]),r(o,i)>=0)break;e[t]=o,t=a;}e[t]=i;};var fl=e((function(t){t.exports=function(t,e){var r,n,i,a,o,s,u,l;for(r=3&t.length,n=t.length-r,i=e,o=3432918353,s=461845907,l=0;l<n;)u=255&t.charCodeAt(l)|(255&t.charCodeAt(++l))<<8|(255&t.charCodeAt(++l))<<16|(255&t.charCodeAt(++l))<<24,++l,i=27492+(65535&(a=5*(65535&(i=(i^=u=(65535&(u=(u=(65535&u)*o+(((u>>>16)*o&65535)<<16)&4294967295)<<15|u>>>17))*s+(((u>>>16)*s&65535)<<16)&4294967295)<<13|i>>>19))+((5*(i>>>16)&65535)<<16)&4294967295))+((58964+(a>>>16)&65535)<<16);switch(u=0,r){case 3:u^=(255&t.charCodeAt(l+2))<<16;case 2:u^=(255&t.charCodeAt(l+1))<<8;case 1:i^=u=(65535&(u=(u=(65535&(u^=255&t.charCodeAt(l)))*o+(((u>>>16)*o&65535)<<16)&4294967295)<<15|u>>>17))*s+(((u>>>16)*s&65535)<<16)&4294967295;}return i^=t.length,i=2246822507*(65535&(i^=i>>>16))+((2246822507*(i>>>16)&65535)<<16)&4294967295,i=3266489909*(65535&(i^=i>>>13))+((3266489909*(i>>>16)&65535)<<16)&4294967295,(i^=i>>>16)>>>0};})),yl=e((function(t){t.exports=function(t,e){for(var r,n=t.length,i=e^n,a=0;n>=4;)r=1540483477*(65535&(r=255&t.charCodeAt(a)|(255&t.charCodeAt(++a))<<8|(255&t.charCodeAt(++a))<<16|(255&t.charCodeAt(++a))<<24))+((1540483477*(r>>>16)&65535)<<16),i=1540483477*(65535&i)+((1540483477*(i>>>16)&65535)<<16)^(r=1540483477*(65535&(r^=r>>>24))+((1540483477*(r>>>16)&65535)<<16)),n-=4,++a;switch(n){case 3:i^=(255&t.charCodeAt(a+2))<<16;case 2:i^=(255&t.charCodeAt(a+1))<<8;case 1:i=1540483477*(65535&(i^=255&t.charCodeAt(a)))+((1540483477*(i>>>16)&65535)<<16);}return i=1540483477*(65535&(i^=i>>>13))+((1540483477*(i>>>16)&65535)<<16),(i^=i>>>15)>>>0};})),dl=fl,ml=fl,vl=yl;dl.murmur3=ml,dl.murmur2=vl;var gl=7,xl=Number.POSITIVE_INFINITY;function bl(t,e){return e[1]!==xl?function(t,e,r){var n=0,i=0;switch(e=Math.abs(e),r=Math.abs(r),t){case"top-right":case"top-left":case"top":i=r-gl;break;case"bottom-right":case"bottom-left":case"bottom":i=-r+gl;}switch(t){case"top-right":case"bottom-right":case"right":n=-e;break;case"top-left":case"bottom-left":case"left":n=e;}return [n,i]}(t,e[0],e[1]):function(t,e){var r=0,n=0;e<0&&(e=0);var i=e/Math.sqrt(2);switch(t){case"top-right":case"top-left":n=i-gl;break;case"bottom-right":case"bottom-left":n=-i+gl;break;case"bottom":n=-e+gl;break;case"top":n=e-gl;}switch(t){case"top-right":case"bottom-right":r=-i;break;case"top-left":case"bottom-left":r=i;break;case"left":r=e;break;case"right":r=-e;}return [r,n]}(t,e[0])}function _l(t){switch(t){case"right":case"top-right":case"bottom-right":return "right";case"left":case"top-left":case"bottom-left":return "left"}return "center"}var wl=65535;function Al(t,e,r,n,a,o,s,u,l,p,c,h,f,y){var d=function(t,e,r,n,a,o,s,u){for(var l=n.layout.get("text-rotate").evaluate(o,{})*Math.PI/180,p=e.positionedGlyphs,c=[],h=0;h<p.length;h++){var f=p[h],y=s[f.fontStack],d=y&&y[f.glyph];if(d){var m=d.rect;if(m){var v=Cu+1,g=d.metrics.advance*f.scale/2,x=a?[f.x+g,f.y]:[0,0],b=a?[0,0]:[f.x+g+r[0],f.y+r[1]],_=(a||u)&&f.vertical,w=[0,0];_&&(w=b,b=[0,0]);var A=(d.metrics.left-v)*f.scale-g+b[0],k=(-d.metrics.top-v)*f.scale+b[1],S=A+m.w*f.scale,z=k+m.h*f.scale,I=new i(A,k),C=new i(S,k),B=new i(A,z),E=new i(S,z);if(_){var M=new i(-g,g-e.yOffset),P=-Math.PI/2,T=ds/2-g,V=new i(5-e.yOffset-T,0),F=new(Function.prototype.bind.apply(i,[null].concat(w)));I._rotateAround(P,M)._add(V)._add(F),C._rotateAround(P,M)._add(V)._add(F),B._rotateAround(P,M)._add(V)._add(F),E._rotateAround(P,M)._add(V)._add(F);}if(l){var O=Math.sin(l),L=Math.cos(l),D=[L,-O,O,L];I._matMult(D),C._matMult(D),B._matMult(D),E._matMult(D);}c.push({tl:I,tr:C,bl:B,br:E,tex:m,writingMode:e.writingMode,glyphOffset:x,sectionIndex:f.sectionIndex});}}}return c}(0,r,s,n,a,o,h,t.allowVerticalPlacement),m=t.textSizeData,v=null;"source"===m.kind?(v=[Cs*n.layout.get("text-size").evaluate(o,{})])[0]>wl&&w(t.layerIds[0]+': Value for "text-size" is >= 256. Reduce your "text-size".'):"composite"===m.kind&&((v=[Cs*y.compositeTextSizes[0].evaluate(o,{}),Cs*y.compositeTextSizes[1].evaluate(o,{})])[0]>wl||v[1]>wl)&&w(t.layerIds[0]+': Value for "text-size" is >= 256. Reduce your "text-size".'),t.addSymbols(t.text,d,v,s,a,o,l,e,u.lineStartIndex,u.lineLength,f);for(var g=0,x=p;g<x.length;g+=1){c[x[g]]=t.text.placedSymbolArray.length-1;}return 4*d.length}function kl(t,e,r,n){var i=t.compareText;if(e in i){for(var a=i[e],o=a.length-1;o>=0;o--)if(n.dist(a[o])<r)return !0}else i[e]=[];return i[e].push(n),!1}t.Actor=Eu,t.AlphaImage=Da,t.CanonicalTileID=ju,t.CollisionBoxArray=Si,t.Color=Yt,t.DEMData=Zu,t.DataConstantProperty=Zn,t.DictionaryCoder=Gu,t.EXTENT=oa,t.ErrorEvent=kt,t.EvaluationParameters=On,t.Event=At,t.Evented=St,t.FeatureIndex=$u,t.FillBucket=Co,t.FillExtrusionBucket=Zo,t.ImageAtlas=Qs,t.ImagePosition=$s,t.LineBucket=rs,t.LngLat=Tu,t.LngLatBounds=Pu,t.MercatorCoordinate=Ru,t.ONE_EM=ds,t.OverscaledTileID=Nu,t.Point=i,t.Point$1=i,t.ProgramConfiguration=ra,t.Properties=Yn,t.Protobuf=su,t.RGBAImage=Ua,t.RequestManager=j,t.ResourceType=pt,t.SegmentVector=Li,t.SourceFeatureState=Yu,t.StructArrayLayout1ui2=_i,t.StructArrayLayout2i4=ni,t.StructArrayLayout2ui4=bi,t.StructArrayLayout3ui6=xi,t.StructArrayLayout4i8=ii,t.SymbolBucket=Us,t.Texture=iu,t.Tile=tl,t.Transitionable=Un,t.Uniform1f=Ni,t.Uniform1i=qi,t.Uniform2f=Ki,t.Uniform3f=Zi,t.Uniform4f=Xi,t.UniformColor=Gi,t.UniformMatrix4f=Hi,t.UnwrappedTileID=qu,t.ValidationError=It,t.WritingMode=ms,t.ZoomHistory=An,t.addDynamicAttributes=Os,t.asyncAll=function(t,e,r){if(!t.length)return r(null,[]);var n=t.length,i=new Array(t.length),a=null;t.forEach((function(t,o){e(t,(function(t,e){t&&(a=t),i[o]=e,0==--n&&r(a,i);}));}));},t.bezier=s,t.bindAll=m,t.browser=V,t.cacheEntryPossiblyAdded=function(t){++lt>it&&(t.getActor().send("enforceCacheSizeLimit",nt),lt=0);},t.clamp=l,t.clearTileCache=function(t){var e=self.caches.delete(rt);t&&e.catch(t).then((function(){return t()}));},t.clone=function(t){var e=new Ca(16);return e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15],e},t.clone$1=b,t.config=F,t.create=function(){var t=new Ca(16);return Ca!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0),t[0]=1,t[5]=1,t[10]=1,t[15]=1,t},t.create$1=function(){var t=new Ca(9);return Ca!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[5]=0,t[6]=0,t[7]=0),t[0]=1,t[4]=1,t[8]=1,t},t.create$2=function(){var t=new Ca(4);return Ca!=Float32Array&&(t[1]=0,t[2]=0),t[0]=1,t[3]=1,t},t.createCommonjsModule=e,t.createExpression=Cr,t.createLayout=ei,t.createStyleLayer=function(t){return "custom"===t.type?new Js(t):new Hs[t.type](t)},t.deepEqual=o,t.ease=u,t.emitValidationErrors=fn,t.endsWith=v,t.enforceCacheSizeLimit=function(t){self.caches&&self.caches.open(rt).then((function(e){e.keys().then((function(r){for(var n=0;n<r.length-t;n++)e.delete(r[n]);}));}));},t.evaluateSizeForFeature=Es,t.evaluateSizeForZoom=Ms,t.evaluateVariableOffset=bl,t.evented=Vn,t.extend=c,t.featureFilter=jr,t.filterObject=x,t.fromRotation=function(t,e){var r=Math.sin(e),n=Math.cos(e);return t[0]=n,t[1]=r,t[2]=0,t[3]=-r,t[4]=n,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},t.getAnchorAlignment=Ss,t.getAnchorJustification=_l,t.getArrayBuffer=mt,t.getImage=bt,t.getJSON=function(t,e){return dt(c(t,{type:"json"}),e)},t.getReferrer=ft,t.getVideo=function(t,e){var r,n,i=self.document.createElement("video");i.muted=!0,i.onloadstart=function(){e(null,i);};for(var a=0;a<t.length;a++){var o=self.document.createElement("source");r=t[a],n=void 0,(n=self.document.createElement("a")).href=r,(n.protocol!==self.document.location.protocol||n.host!==self.document.location.host)&&(i.crossOrigin="Anonymous"),o.src=t[a],i.appendChild(o);}return {cancel:function(){}}},t.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},t.invert=function(t,e){var r=e[0],n=e[1],i=e[2],a=e[3],o=e[4],s=e[5],u=e[6],l=e[7],p=e[8],c=e[9],h=e[10],f=e[11],y=e[12],d=e[13],m=e[14],v=e[15],g=r*s-n*o,x=r*u-i*o,b=r*l-a*o,_=n*u-i*s,w=n*l-a*s,A=i*l-a*u,k=p*d-c*y,S=p*m-h*y,z=p*v-f*y,I=c*m-h*d,C=c*v-f*d,B=h*v-f*m,E=g*B-x*C+b*I+_*z-w*S+A*k;return E?(E=1/E,t[0]=(s*B-u*C+l*I)*E,t[1]=(i*C-n*B-a*I)*E,t[2]=(d*A-m*w+v*_)*E,t[3]=(h*w-c*A-f*_)*E,t[4]=(u*z-o*B-l*S)*E,t[5]=(r*B-i*z+a*S)*E,t[6]=(m*b-y*A-v*x)*E,t[7]=(p*A-h*b+f*x)*E,t[8]=(o*C-s*z+l*k)*E,t[9]=(n*z-r*C-a*k)*E,t[10]=(y*w-d*b+v*g)*E,t[11]=(c*b-p*w-f*g)*E,t[12]=(s*S-o*I-u*k)*E,t[13]=(r*I-n*S+i*k)*E,t[14]=(d*x-y*_-m*g)*E,t[15]=(p*_-c*x+h*g)*E,t):null},t.isChar=kn,t.isMapboxURL=q,t.keysDifference=function(t,e){var r=[];for(var n in t)n in e||r.push(n);return r},t.makeRequest=dt,t.mapObject=g,t.mercatorXfromLng=Ou,t.mercatorYfromLat=Lu,t.mercatorZfromAltitude=Du,t.multiply=function(t,e,r){var n=e[0],i=e[1],a=e[2],o=e[3],s=e[4],u=e[5],l=e[6],p=e[7],c=e[8],h=e[9],f=e[10],y=e[11],d=e[12],m=e[13],v=e[14],g=e[15],x=r[0],b=r[1],_=r[2],w=r[3];return t[0]=x*n+b*s+_*c+w*d,t[1]=x*i+b*u+_*h+w*m,t[2]=x*a+b*l+_*f+w*v,t[3]=x*o+b*p+_*y+w*g,x=r[4],b=r[5],_=r[6],w=r[7],t[4]=x*n+b*s+_*c+w*d,t[5]=x*i+b*u+_*h+w*m,t[6]=x*a+b*l+_*f+w*v,t[7]=x*o+b*p+_*y+w*g,x=r[8],b=r[9],_=r[10],w=r[11],t[8]=x*n+b*s+_*c+w*d,t[9]=x*i+b*u+_*h+w*m,t[10]=x*a+b*l+_*f+w*v,t[11]=x*o+b*p+_*y+w*g,x=r[12],b=r[13],_=r[14],w=r[15],t[12]=x*n+b*s+_*c+w*d,t[13]=x*i+b*u+_*h+w*m,t[14]=x*a+b*l+_*f+w*v,t[15]=x*o+b*p+_*y+w*g,t},t.mvt=jo,t.number=Ae,t.ortho=function(t,e,r,n,i,a,o){var s=1/(e-r),u=1/(n-i),l=1/(a-o);return t[0]=-2*s,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*u,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*l,t[11]=0,t[12]=(e+r)*s,t[13]=(i+n)*u,t[14]=(o+a)*l,t[15]=1,t},t.parseGlyphPBF=function(t){return new su(t).readFields(Su,[])},t.pbf=su,t.performSymbolLayout=function(t,e,r,n,a,o){t.createArrays();var s=512*t.overscaling;t.tilePixelRatio=oa/s,t.compareText={},t.iconsNeedLinear=!1;var u=t.layers[0].layout,l=t.layers[0]._unevaluatedLayout._values,p={};if("composite"===t.textSizeData.kind){var c=t.textSizeData,h=c.minZoom,f=c.maxZoom;p.compositeTextSizes=[l["text-size"].possiblyEvaluate(new On(h)),l["text-size"].possiblyEvaluate(new On(f))];}if("composite"===t.iconSizeData.kind){var y=t.iconSizeData,d=y.minZoom,m=y.maxZoom;p.compositeIconSizes=[l["icon-size"].possiblyEvaluate(new On(d)),l["icon-size"].possiblyEvaluate(new On(m))];}p.layoutTextSize=l["text-size"].possiblyEvaluate(new On(t.zoom+1)),p.layoutIconSize=l["icon-size"].possiblyEvaluate(new On(t.zoom+1)),p.textMaxSize=l["text-size"].possiblyEvaluate(new On(18));for(var v=u.get("text-line-height")*ds,g="map"===u.get("text-rotation-alignment")&&"point"!==u.get("symbol-placement"),x=u.get("text-keep-upright"),b=function(){var o=A[_],s=u.get("text-font").evaluate(o,{}).join(","),l=r,c={horizontal:{},vertical:void 0},h=o.text,f=[0,0];if(h){var y=h.toString(),d=u.get("text-letter-spacing").evaluate(o,{})*ds,m=function(t){for(var e=0,r=t;e<r.length;e+=1){if(!zn(r[e].charCodeAt(0)))return !1}return !0}(y)?d:0,b=u.get("text-anchor").evaluate(o,{}),k=u.get("text-variable-anchor");if(!k){var S=u.get("text-radial-offset").evaluate(o,{});f=S?bl(b,[S*ds,xl]):u.get("text-offset").evaluate(o,{}).map((function(t){return t*ds}));}var z=g?"center":u.get("text-justify").evaluate(o,{}),I=u.get("symbol-placement"),C="point"===I?u.get("text-max-width").evaluate(o,{})*ds:0,B=function(){t.allowVerticalPlacement&&Sn(y)&&(c.vertical=gs(h,e,s,C,v,b,"left",m,f,ms.vertical,!0,I));};if(!g&&k){for(var E="auto"===z?k.map((function(t){return _l(t)})):[z],M=!1,P=0;P<E.length;P++){var T=E[P];if(!c.horizontal[T])if(M)c.horizontal[T]=c.horizontal[0];else{var V=gs(h,e,s,C,v,"center",T,m,f,ms.horizontal,!1,I);V&&(c.horizontal[T]=V,M=1===V.lineCount);}}B();}else{"auto"===z&&(z=_l(b));var F=gs(h,e,s,C,v,b,z,m,f,ms.horizontal,!1,I);F&&(c.horizontal[z]=F),B(),Sn(y)&&g&&x&&(c.vertical=gs(h,e,s,C,v,b,z,m,f,ms.vertical,!1,I));}}var O=void 0;if(o.icon&&o.icon.name){var L=n[o.icon.name];L&&(O=function(t,e,r){var n=Ss(r),i=n.horizontalAlign,a=n.verticalAlign,o=e[0],s=e[1],u=o-t.displaySize[0]*i,l=u+t.displaySize[0],p=s-t.displaySize[1]*a;return {image:t,top:p,bottom:p+t.displaySize[1],left:u,right:l}}(a[o.icon.name],u.get("icon-offset").evaluate(o,{}),u.get("icon-anchor").evaluate(o,{})),void 0===t.sdfIcons?t.sdfIcons=L.sdf:t.sdfIcons!==L.sdf&&w("Style sheet warning: Cannot mix SDF and non-SDF icons in one buffer"),L.pixelRatio!==t.pixelRatio?t.iconsNeedLinear=!0:0!==u.get("icon-rotate").constantOr(1)&&(t.iconsNeedLinear=!0));}(Object.keys(c.horizontal).length||O)&&function(t,e,r,n,a,o,s){var u=o.layoutTextSize.evaluate(e,{}),l=o.layoutIconSize.evaluate(e,{}),p=o.textMaxSize.evaluate(e,{});void 0===p&&(p=u);var c=t.layers[0].layout,h=c.get("icon-offset").evaluate(e,{}),f=function(t){for(var e in t)return t[e];return null}(r.horizontal),y=u/24,d=t.tilePixelRatio*y,m=t.tilePixelRatio*p/24,v=t.tilePixelRatio*l,g=t.tilePixelRatio*c.get("symbol-spacing"),x=c.get("text-padding")*t.tilePixelRatio,b=c.get("icon-padding")*t.tilePixelRatio,_=c.get("text-max-angle")/180*Math.PI,A="map"===c.get("text-rotation-alignment")&&"point"!==c.get("symbol-placement"),k="map"===c.get("icon-rotation-alignment")&&"point"!==c.get("symbol-placement"),S=c.get("symbol-placement"),z=g/2,I=c.get("icon-text-fit");n&&"none"!==I&&f&&(n=function(t,e,r,n,i,a){var o,s,u,l,p=t.image,c=e.left*a,h=e.right*a;"width"===r||"both"===r?(l=i[0]+c-n[3],s=i[0]+h+n[1]):s=(l=i[0]+(c+h-p.displaySize[0])/2)+p.displaySize[0];var f=e.top*a,y=e.bottom*a;return "height"===r||"both"===r?(o=i[1]+f-n[0],u=i[1]+y+n[2]):u=(o=i[1]+(f+y-p.displaySize[1])/2)+p.displaySize[1],{image:p,top:o,right:s,bottom:u,left:l}}(n,f,I,c.get("icon-text-fit-padding"),h,y));var C=function(u,l){l.x<0||l.x>=oa||l.y<0||l.y>=oa||function(t,e,r,n,a,o,s,u,l,p,c,h,f,y,d,m,v,g,x,b,_){var A,k,S,z,I=t.addToLineVertexArray(e,r),C=0,B=0,E=0,M=-1,P={},T=dl(""),V=0,F=0;void 0===o._unevaluatedLayout.getValue("text-radial-offset")?(A=o.layout.get("text-offset").evaluate(x,{}).map((function(t){return t*ds})),V=A[0],F=A[1]):(V=o.layout.get("text-radial-offset").evaluate(x,{})*ds,F=xl);if(t.allowVerticalPlacement&&n.vertical){var O=o.layout.get("text-rotate").evaluate(x,{})+90,L=n.vertical;z=new sl(s,r,e,u,l,p,L,c,h,f,t.overscaling,O);}if(a){var D=o.layout.get("icon-rotate").evaluate(x,{}),U=function(t,e){var r=t.image,n=t.right-t.left,a=(n*r.paddedRect.w/(r.paddedRect.w-2)-n)/2,o=t.left-a,s=t.right+a,u=t.bottom-t.top,l=(u*r.paddedRect.h/(r.paddedRect.h-2)-u)/2,p=t.top-l,c=t.bottom+l,h=new i(o,p),f=new i(s,p),y=new i(s,c),d=new i(o,c),m=e*Math.PI/180;if(m){var v=Math.sin(m),g=Math.cos(m),x=[g,-v,v,g];h._matMult(x),f._matMult(x),d._matMult(x),y._matMult(x);}return [{tl:h,tr:f,bl:d,br:y,tex:r.paddedRect,writingMode:void 0,glyphOffset:[0,0],sectionIndex:0}]}(a,D);S=new sl(s,r,e,u,l,p,a,d,m,!1,t.overscaling,D),C=4*U.length;var R=t.iconSizeData,j=null;"source"===R.kind?(j=[Cs*o.layout.get("icon-size").evaluate(x,{})])[0]>wl&&w(t.layerIds[0]+': Value for "icon-size" is >= 256. Reduce your "icon-size".'):"composite"===R.kind&&((j=[Cs*_.compositeIconSizes[0].evaluate(x,{}),Cs*_.compositeIconSizes[1].evaluate(x,{})])[0]>wl||j[1]>wl)&&w(t.layerIds[0]+': Value for "icon-size" is >= 256. Reduce your "icon-size".'),t.addSymbols(t.icon,U,j,g,v,x,!1,e,I.lineStartIndex,I.lineLength,-1),M=t.icon.placedSymbolArray.length-1;}for(var q in n.horizontal){var N=n.horizontal[q];if(!k){T=dl(N.text);var K=o.layout.get("text-rotate").evaluate(x,{});k=new sl(s,r,e,u,l,p,N,c,h,f,t.overscaling,K);}var Z=1===N.lineCount;if(B+=Al(t,e,N,o,f,x,y,I,n.vertical?ms.horizontal:ms.horizontalOnly,Z?Object.keys(n.horizontal):[q],P,b,M,_),Z)break}n.vertical&&(E+=Al(t,e,n.vertical,o,f,x,y,I,ms.vertical,["vertical"],P,b,M,_));var X=k?k.boxStartIndex:t.collisionBoxArray.length,G=k?k.boxEndIndex:t.collisionBoxArray.length,J=z?z.boxStartIndex:t.collisionBoxArray.length,H=z?z.boxEndIndex:t.collisionBoxArray.length,Y=S?S.boxStartIndex:t.collisionBoxArray.length,$=S?S.boxEndIndex:t.collisionBoxArray.length;t.glyphOffsetArray.length>=Us.MAX_GLYPHS&&w("Too many glyphs being rendered in a tile. See https://github.com/mapbox/mapbox-gl-js/issues/2907");t.symbolInstances.emplaceBack(e.x,e.y,P.right>=0?P.right:-1,P.center>=0?P.center:-1,P.left>=0?P.left:-1,P.vertical||-1,M,T,X,G,J,H,Y,$,u,B,E,C,0,c,V,F);}(t,l,u,r,n,t.layers[0],t.collisionBoxArray,e.index,e.sourceLayerIndex,t.index,d,x,A,s,v,b,k,h,e,a,o);};if("line"===S)for(var B=0,E=function(t,e,r,n,a){for(var o=[],s=0;s<t.length;s++)for(var u=t[s],l=void 0,p=0;p<u.length-1;p++){var c=u[p],h=u[p+1];c.x<e&&h.x<e||(c.x<e?c=new i(e,c.y+(h.y-c.y)*((e-c.x)/(h.x-c.x)))._round():h.x<e&&(h=new i(e,c.y+(h.y-c.y)*((e-c.x)/(h.x-c.x)))._round()),c.y<r&&h.y<r||(c.y<r?c=new i(c.x+(h.x-c.x)*((r-c.y)/(h.y-c.y)),r)._round():h.y<r&&(h=new i(c.x+(h.x-c.x)*((r-c.y)/(h.y-c.y)),r)._round()),c.x>=n&&h.x>=n||(c.x>=n?c=new i(n,c.y+(h.y-c.y)*((n-c.x)/(h.x-c.x)))._round():h.x>=n&&(h=new i(n,c.y+(h.y-c.y)*((n-c.x)/(h.x-c.x)))._round()),c.y>=a&&h.y>=a||(c.y>=a?c=new i(c.x+(h.x-c.x)*((a-c.y)/(h.y-c.y)),a)._round():h.y>=a&&(h=new i(c.x+(h.x-c.x)*((a-c.y)/(h.y-c.y)),a)._round()),l&&c.equals(l[l.length-1])||(l=[c],o.push(l)),l.push(h)))));}return o}(e.geometry,0,0,oa,oa);B<E.length;B+=1)for(var M=E[B],P=ol(M,g,_,r.vertical||f,n,24,m,t.overscaling,oa),T=0,V=P;T<V.length;T+=1){var F=V[T],O=f;O&&kl(t,O.text,z,F)||C(M,F);}else if("line-center"===S)for(var L=0,D=e.geometry;L<D.length;L+=1){var U=D[L];if(U.length>1){var R=al(U,_,r.vertical||f,n,24,m);R&&C(U,R);}}else if("Polygon"===e.type)for(var j=0,q=ko(e.geometry,0);j<q.length;j+=1){var N=q[j],K=pl(N,16);C(N[0],new Is(K.x,K.y,0));}else if("LineString"===e.type)for(var Z=0,X=e.geometry;Z<X.length;Z+=1){var G=X[Z];C(G,new Is(G[0].x,G[0].y,0));}else if("Point"===e.type)for(var J=0,H=e.geometry;J<H.length;J+=1)for(var Y=H[J],$=0,W=Y;$<W.length;$+=1){var Q=W[$];C([Q],new Is(Q.x,Q.y,0));}}(t,o,c,O,l,p,f);},_=0,A=t.features;_<A.length;_+=1)b();o&&t.generateCollisionDebugBuffers();},t.perspective=function(t,e,r,n,i){var a,o=1/Math.tan(e/2);return t[0]=o/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=o,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,null!=i&&i!==1/0?(a=1/(n-i),t[10]=(i+n)*a,t[14]=2*i*n*a):(t[10]=-1,t[14]=-2*n),t},t.pick=function(t,e){for(var r={},n=0;n<e.length;n++){var i=e[n];i in t&&(r[i]=t[i]);}return r},t.plugin=Fn,t.polygonIntersectsPolygon=ha,t.postMapLoadEvent=et,t.postTurnstileEvent=Q,t.potpack=Ys,t.rasterBoundsAttributes=Xu,t.refProperties=["type","source","source-layer","minzoom","maxzoom","filter","layout"],t.register=xn,t.registerForPluginAvailability=function(t){return Pn?t({pluginURL:Pn,completionCallback:En}):Vn.once("pluginAvailable",t),t},t.rotate=function(t,e,r){var n=e[0],i=e[1],a=e[2],o=e[3],s=Math.sin(r),u=Math.cos(r);return t[0]=n*u+a*s,t[1]=i*u+o*s,t[2]=n*-s+a*u,t[3]=i*-s+o*u,t},t.rotateX=function(t,e,r){var n=Math.sin(r),i=Math.cos(r),a=e[4],o=e[5],s=e[6],u=e[7],l=e[8],p=e[9],c=e[10],h=e[11];return e!==t&&(t[0]=e[0],t[1]=e[1],t[2]=e[2],t[3]=e[3],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t[4]=a*i+l*n,t[5]=o*i+p*n,t[6]=s*i+c*n,t[7]=u*i+h*n,t[8]=l*i-a*n,t[9]=p*i-o*n,t[10]=c*i-s*n,t[11]=h*i-u*n,t},t.rotateZ=function(t,e,r){var n=Math.sin(r),i=Math.cos(r),a=e[0],o=e[1],s=e[2],u=e[3],l=e[4],p=e[5],c=e[6],h=e[7];return e!==t&&(t[8]=e[8],t[9]=e[9],t[10]=e[10],t[11]=e[11],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t[0]=a*i+l*n,t[1]=o*i+p*n,t[2]=s*i+c*n,t[3]=u*i+h*n,t[4]=l*i-a*n,t[5]=p*i-o*n,t[6]=c*i-s*n,t[7]=h*i-u*n,t},t.scale=function(t,e,r){var n=r[0],i=r[1],a=r[2];return t[0]=e[0]*n,t[1]=e[1]*n,t[2]=e[2]*n,t[3]=e[3]*n,t[4]=e[4]*i,t[5]=e[5]*i,t[6]=e[6]*i,t[7]=e[7]*i,t[8]=e[8]*a,t[9]=e[9]*a,t[10]=e[10]*a,t[11]=e[11]*a,t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15],t},t.setCacheLimits=function(t,e){nt=t,it=e;},t.setRTLTextPlugin=function(t,e){if(Mn)throw new Error("setRTLTextPlugin cannot be called multiple times.");Mn=!0,Pn=V.resolveURL(t),En=function(t){t?(Mn=!1,Pn=null,e&&e(t)):Tn=!0;},Vn.fire(new At("pluginAvailable",{pluginURL:Pn,completionCallback:En}));},t.sphericalToCartesian=function(t){var e=t[0],r=t[1],n=t[2];return r+=90,r*=Math.PI/180,n*=Math.PI/180,{x:e*Math.cos(r)*Math.sin(n),y:e*Math.sin(r)*Math.sin(n),z:e*Math.cos(n)}},t.styleSpec=zt,t.symbolSize=Ps,t.transformMat3=function(t,e,r){var n=e[0],i=e[1],a=e[2];return t[0]=n*r[0]+i*r[3]+a*r[6],t[1]=n*r[1]+i*r[4]+a*r[7],t[2]=n*r[2]+i*r[5]+a*r[8],t},t.transformMat4=Ma,t.translate=function(t,e,r){var n,i,a,o,s,u,l,p,c,h,f,y,d=r[0],m=r[1],v=r[2];return e===t?(t[12]=e[0]*d+e[4]*m+e[8]*v+e[12],t[13]=e[1]*d+e[5]*m+e[9]*v+e[13],t[14]=e[2]*d+e[6]*m+e[10]*v+e[14],t[15]=e[3]*d+e[7]*m+e[11]*v+e[15]):(n=e[0],i=e[1],a=e[2],o=e[3],s=e[4],u=e[5],l=e[6],p=e[7],c=e[8],h=e[9],f=e[10],y=e[11],t[0]=n,t[1]=i,t[2]=a,t[3]=o,t[4]=s,t[5]=u,t[6]=l,t[7]=p,t[8]=c,t[9]=h,t[10]=f,t[11]=y,t[12]=n*d+s*m+c*v+e[12],t[13]=i*d+u*m+h*v+e[13],t[14]=a*d+l*m+f*v+e[14],t[15]=o*d+p*m+y*v+e[15]),t},t.uniqueId=f,t.validateCustomStyleLayer=function(t){var e=[],r=t.id;return void 0===r&&e.push({message:"layers."+r+': missing required property "id"'}),void 0===t.render&&e.push({message:"layers."+r+': missing required method "render"'}),t.renderingMode&&"2d"!==t.renderingMode&&"3d"!==t.renderingMode&&e.push({message:"layers."+r+': property "renderingMode" must be either "2d" or "3d"'}),e},t.validateLight=pn,t.validateStyle=ln,t.values=function(t){var e=[];for(var r in t)e.push(t[r]);return e},t.vectorTile=jo,t.version="1.4.0",t.warnOnce=w,t.webpSupported=O,t.window=self,t.wrap=p;}));

  define(["./shared"],(function(e){function t(e){var r=typeof e;if("number"===r||"boolean"===r||"string"===r||null==e)return JSON.stringify(e);if(Array.isArray(e)){for(var i="[",o=0,n=e;o<n.length;o+=1){i+=t(n[o])+",";}return i+"]"}for(var a=Object.keys(e).sort(),s="{",l=0;l<a.length;l++)s+=JSON.stringify(a[l])+":"+t(e[a[l]])+",";return s+"}"}function r(r){for(var i="",o=0,n=e.refProperties;o<n.length;o+=1){i+="/"+t(r[n[o]]);}return i}var i=function(e){this.keyCache={},e&&this.replace(e);};i.prototype.replace=function(e){this._layerConfigs={},this._layers={},this.update(e,[]);},i.prototype.update=function(t,i){for(var o=this,n=0,a=t;n<a.length;n+=1){var s=a[n];this._layerConfigs[s.id]=s;var l=this._layers[s.id]=e.createStyleLayer(s);l._featureFilter=e.featureFilter(l.filter),this.keyCache[s.id]&&delete this.keyCache[s.id];}for(var u=0,h=i;u<h.length;u+=1){var c=h[u];delete this.keyCache[c],delete this._layerConfigs[c],delete this._layers[c];}this.familiesBySource={};for(var p=0,f=function(e,t){for(var i={},o=0;o<e.length;o++){var n=t&&t[e[o].id]||r(e[o]);t&&(t[e[o].id]=n);var a=i[n];a||(a=i[n]=[]),a.push(e[o]);}var s=[];for(var l in i)s.push(i[l]);return s}(e.values(this._layerConfigs),this.keyCache);p<f.length;p+=1){var d=f[p].map((function(e){return o._layers[e.id]})),g=d[0];if("none"!==g.visibility){var m=g.source||"",v=this.familiesBySource[m];v||(v=this.familiesBySource[m]={});var y=g.sourceLayer||"_geojsonTileLayer",x=v[y];x||(x=v[y]=[]),x.push(d);}}};var o=function(t){var r={},i=[];for(var o in t){var n=t[o],a=r[o]={};for(var s in n){var l=n[+s];if(l&&0!==l.bitmap.width&&0!==l.bitmap.height){var u={x:0,y:0,w:l.bitmap.width+2,h:l.bitmap.height+2};i.push(u),a[s]={rect:u,metrics:l.metrics};}}}var h=e.potpack(i),c=h.w,p=h.h,f=new e.AlphaImage({width:c||1,height:p||1});for(var d in t){var g=t[d];for(var m in g){var v=g[+m];if(v&&0!==v.bitmap.width&&0!==v.bitmap.height){var y=r[d][m].rect;e.AlphaImage.copy(v.bitmap,f,{x:0,y:0},{x:y.x+1,y:y.y+1},v.bitmap);}}}this.image=f,this.positions=r;};e.register("GlyphAtlas",o);var n=function(t){this.tileID=new e.OverscaledTileID(t.tileID.overscaledZ,t.tileID.wrap,t.tileID.canonical.z,t.tileID.canonical.x,t.tileID.canonical.y),this.uid=t.uid,this.zoom=t.zoom,this.pixelRatio=t.pixelRatio,this.tileSize=t.tileSize,this.source=t.source,this.overscaling=this.tileID.overscaleFactor(),this.showCollisionBoxes=t.showCollisionBoxes,this.collectResourceTiming=!!t.collectResourceTiming,this.returnDependencies=!!t.returnDependencies;};function a(t,r,i){for(var o=new e.EvaluationParameters(r),n=0,a=t;n<a.length;n+=1){a[n].recalculate(o,i);}}n.prototype.parse=function(t,r,i,n,s){var l=this;this.status="parsing",this.data=t,this.collisionBoxArray=new e.CollisionBoxArray;var u=new e.DictionaryCoder(Object.keys(t.layers).sort()),h=new e.FeatureIndex(this.tileID);h.bucketLayerIDs=[];var c,p,f,d,g={},m={featureIndex:h,iconDependencies:{},patternDependencies:{},glyphDependencies:{},availableImages:i},v=r.familiesBySource[this.source];for(var y in v){var x=t.layers[y];if(x){1===x.version&&e.warnOnce('Vector tile source "'+this.source+'" layer "'+y+'" does not use vector tile spec v2 and therefore may have some rendering errors.');for(var w=u.encode(y),S=[],M=0;M<x.length;M++){var b=x.feature(M);S.push({feature:b,index:M,sourceLayerIndex:w});}for(var k=0,I=v[y];k<I.length;k+=1){var _=I[k],P=_[0];if(!(P.minzoom&&this.zoom<Math.floor(P.minzoom)))if(!(P.maxzoom&&this.zoom>=P.maxzoom))if("none"!==P.visibility)a(_,this.zoom,i),(g[P.id]=P.createBucket({index:h.bucketLayerIDs.length,layers:_,zoom:this.zoom,pixelRatio:this.pixelRatio,overscaling:this.overscaling,collisionBoxArray:this.collisionBoxArray,sourceLayerIndex:w,sourceID:this.source})).populate(S,m),h.bucketLayerIDs.push(_.map((function(e){return e.id})));}}}var T=e.mapObject(m.glyphDependencies,(function(e){return Object.keys(e).map(Number)}));Object.keys(T).length?n.send("getGlyphs",{uid:this.uid,stacks:T},(function(e,t){c||(c=e,p=t,C.call(l));})):p={};var L=Object.keys(m.iconDependencies);L.length?n.send("getImages",{icons:L},(function(e,t){c||(c=e,f=t,C.call(l));})):f={};var D=Object.keys(m.patternDependencies);function C(){if(c)return s(c);if(p&&f&&d){var t=new o(p),r=new e.ImageAtlas(f,d);for(var n in g){var l=g[n];l instanceof e.SymbolBucket?(a(l.layers,this.zoom,i),e.performSymbolLayout(l,p,t.positions,f,r.iconPositions,this.showCollisionBoxes)):l.hasPattern&&(l instanceof e.LineBucket||l instanceof e.FillBucket||l instanceof e.FillExtrusionBucket)&&(a(l.layers,this.zoom,i),l.addFeatures(m,r.patternPositions));}this.status="done",s(null,{buckets:e.values(g).filter((function(e){return !e.isEmpty()})),featureIndex:h,collisionBoxArray:this.collisionBoxArray,glyphAtlasImage:t.image,imageAtlas:r,glyphMap:this.returnDependencies?p:null,iconMap:this.returnDependencies?f:null,glyphPositions:this.returnDependencies?t.positions:null});}}D.length?n.send("getImages",{icons:D},(function(e,t){c||(c=e,d=t,C.call(l));})):d={},C.call(this);};var s="undefined"!=typeof performance,l={getEntriesByName:function(e){return !!(s&&performance&&performance.getEntriesByName)&&performance.getEntriesByName(e)},mark:function(e){return !!(s&&performance&&performance.mark)&&performance.mark(e)},measure:function(e,t,r){return !!(s&&performance&&performance.measure)&&performance.measure(e,t,r)},clearMarks:function(e){return !!(s&&performance&&performance.clearMarks)&&performance.clearMarks(e)},clearMeasures:function(e){return !!(s&&performance&&performance.clearMeasures)&&performance.clearMeasures(e)}},u=function(e){this._marks={start:[e.url,"start"].join("#"),end:[e.url,"end"].join("#"),measure:e.url.toString()},l.mark(this._marks.start);};function h(t,r){var i=e.getArrayBuffer(t.request,(function(t,i,o,n){t?r(t):i&&r(null,{vectorTile:new e.vectorTile.VectorTile(new e.pbf(i)),rawData:i,cacheControl:o,expires:n});}));return function(){i.cancel(),r();}}u.prototype.finish=function(){l.mark(this._marks.end);var e=l.getEntriesByName(this._marks.measure);return 0===e.length&&(l.measure(this._marks.measure,this._marks.start,this._marks.end),e=l.getEntriesByName(this._marks.measure),l.clearMarks(this._marks.start),l.clearMarks(this._marks.end),l.clearMeasures(this._marks.measure)),e},l.Performance=u;var c=function(e,t,r,i){this.actor=e,this.layerIndex=t,this.availableImages=r,this.loadVectorData=i||h,this.loading={},this.loaded={};};c.prototype.loadTile=function(t,r){var i=this,o=t.uid;this.loading||(this.loading={});var a=!!(t&&t.request&&t.request.collectResourceTiming)&&new l.Performance(t.request),s=this.loading[o]=new n(t);s.abort=this.loadVectorData(t,(function(t,n){if(delete i.loading[o],t||!n)return s.status="done",i.loaded[o]=s,r(t);var l=n.rawData,u={};n.expires&&(u.expires=n.expires),n.cacheControl&&(u.cacheControl=n.cacheControl);var h={};if(a){var c=a.finish();c&&(h.resourceTiming=JSON.parse(JSON.stringify(c)));}s.vectorTile=n.vectorTile,s.parse(n.vectorTile,i.layerIndex,i.availableImages,i.actor,(function(t,i){if(t||!i)return r(t);r(null,e.extend({rawTileData:l.slice(0)},i,u,h));})),i.loaded=i.loaded||{},i.loaded[o]=s;}));},c.prototype.reloadTile=function(e,t){var r=this,i=this.loaded,o=e.uid,n=this;if(i&&i[o]){var a=i[o];a.showCollisionBoxes=e.showCollisionBoxes;var s=function(e,i){var o=a.reloadCallback;o&&(delete a.reloadCallback,a.parse(a.vectorTile,n.layerIndex,r.availableImages,n.actor,o)),t(e,i);};"parsing"===a.status?a.reloadCallback=s:"done"===a.status&&(a.vectorTile?a.parse(a.vectorTile,this.layerIndex,this.availableImages,this.actor,s):s());}},c.prototype.abortTile=function(e,t){var r=this.loading,i=e.uid;r&&r[i]&&r[i].abort&&(r[i].abort(),delete r[i]),t();},c.prototype.removeTile=function(e,t){var r=this.loaded,i=e.uid;r&&r[i]&&delete r[i],t();};var p=function(){this.loaded={};};p.prototype.loadTile=function(t,r){var i=t.uid,o=t.encoding,n=t.rawImageData,a=new e.DEMData(i,n,o);this.loaded=this.loaded||{},this.loaded[i]=a,r(null,a);},p.prototype.removeTile=function(e){var t=this.loaded,r=e.uid;t&&t[r]&&delete t[r];};var f={RADIUS:6378137,FLATTENING:1/298.257223563,POLAR_RADIUS:6356752.3142};function d(e){var t=0;if(e&&e.length>0){t+=Math.abs(g(e[0]));for(var r=1;r<e.length;r++)t-=Math.abs(g(e[r]));}return t}function g(e){var t,r,i,o,n,a,s=0,l=e.length;if(l>2){for(a=0;a<l;a++)a===l-2?(i=l-2,o=l-1,n=0):a===l-1?(i=l-1,o=0,n=1):(i=a,o=a+1,n=a+2),t=e[i],r=e[o],s+=(m(e[n][0])-m(t[0]))*Math.sin(m(r[1]));s=s*f.RADIUS*f.RADIUS/2;}return s}function m(e){return e*Math.PI/180}var v={geometry:function e(t){var r,i=0;switch(t.type){case"Polygon":return d(t.coordinates);case"MultiPolygon":for(r=0;r<t.coordinates.length;r++)i+=d(t.coordinates[r]);return i;case"Point":case"MultiPoint":case"LineString":case"MultiLineString":return 0;case"GeometryCollection":for(r=0;r<t.geometries.length;r++)i+=e(t.geometries[r]);return i}},ring:g},y=function e(t,r){switch(t&&t.type||null){case"FeatureCollection":return t.features=t.features.map(x(e,r)),t;case"GeometryCollection":return t.geometries=t.geometries.map(x(e,r)),t;case"Feature":return t.geometry=e(t.geometry,r),t;case"Polygon":case"MultiPolygon":return function(e,t){"Polygon"===e.type?e.coordinates=w(e.coordinates,t):"MultiPolygon"===e.type&&(e.coordinates=e.coordinates.map(x(w,t)));return e}(t,r);default:return t}};function x(e,t){return function(r){return e(r,t)}}function w(e,t){t=!!t,e[0]=S(e[0],t);for(var r=1;r<e.length;r++)e[r]=S(e[r],!t);return e}function S(e,t){return function(e){return v.ring(e)>=0}(e)===t?e:e.reverse()}var M=e.vectorTile.VectorTileFeature.prototype.toGeoJSON,b=function(t){this._feature=t,this.extent=e.EXTENT,this.type=t.type,this.properties=t.tags,"id"in t&&!isNaN(t.id)&&(this.id=parseInt(t.id,10));};b.prototype.loadGeometry=function(){if(1===this._feature.type){for(var t=[],r=0,i=this._feature.geometry;r<i.length;r+=1){var o=i[r];t.push([new e.Point$1(o[0],o[1])]);}return t}for(var n=[],a=0,s=this._feature.geometry;a<s.length;a+=1){for(var l=[],u=0,h=s[a];u<h.length;u+=1){var c=h[u];l.push(new e.Point$1(c[0],c[1]));}n.push(l);}return n},b.prototype.toGeoJSON=function(e,t,r){return M.call(this,e,t,r)};var k=function(t){this.layers={_geojsonTileLayer:this},this.name="_geojsonTileLayer",this.extent=e.EXTENT,this.length=t.length,this._features=t;};k.prototype.feature=function(e){return new b(this._features[e])};var I=e.vectorTile.VectorTileFeature,_=P;function P(e,t){this.options=t||{},this.features=e,this.length=e.length;}function T(e,t){this.id="number"==typeof e.id?e.id:void 0,this.type=e.type,this.rawGeometry=1===e.type?[e.geometry]:e.geometry,this.properties=e.tags,this.extent=t||4096;}P.prototype.feature=function(e){return new T(this.features[e],this.options.extent)},T.prototype.loadGeometry=function(){var t=this.rawGeometry;this.geometry=[];for(var r=0;r<t.length;r++){for(var i=t[r],o=[],n=0;n<i.length;n++)o.push(new e.Point$1(i[n][0],i[n][1]));this.geometry.push(o);}return this.geometry},T.prototype.bbox=function(){this.geometry||this.loadGeometry();for(var e=this.geometry,t=1/0,r=-1/0,i=1/0,o=-1/0,n=0;n<e.length;n++)for(var a=e[n],s=0;s<a.length;s++){var l=a[s];t=Math.min(t,l.x),r=Math.max(r,l.x),i=Math.min(i,l.y),o=Math.max(o,l.y);}return [t,i,r,o]},T.prototype.toGeoJSON=I.prototype.toGeoJSON;var L=O,D=O,C=function(e,t){t=t||{};var r={};for(var i in e)r[i]=new _(e[i].features,t),r[i].name=i,r[i].version=t.version,r[i].extent=t.extent;return O({layers:r})},z=_;function O(t){var r=new e.pbf;return function(e,t){for(var r in e.layers)t.writeMessage(3,E,e.layers[r]);}(t,r),r.finish()}function E(e,t){var r;t.writeVarintField(15,e.version||1),t.writeStringField(1,e.name||""),t.writeVarintField(5,e.extent||4096);var i={keys:[],values:[],keycache:{},valuecache:{}};for(r=0;r<e.length;r++)i.feature=e.feature(r),t.writeMessage(2,N,i);var o=i.keys;for(r=0;r<o.length;r++)t.writeStringField(3,o[r]);var n=i.values;for(r=0;r<n.length;r++)t.writeMessage(4,G,n[r]);}function N(e,t){var r=e.feature;void 0!==r.id&&t.writeVarintField(1,r.id),t.writeMessage(2,F,e),t.writeVarintField(3,r.type),t.writeMessage(4,J,r);}function F(e,t){var r=e.feature,i=e.keys,o=e.values,n=e.keycache,a=e.valuecache;for(var s in r.properties){var l=n[s];void 0===l&&(i.push(s),l=i.length-1,n[s]=l),t.writeVarint(l);var u=r.properties[s],h=typeof u;"string"!==h&&"boolean"!==h&&"number"!==h&&(u=JSON.stringify(u));var c=h+":"+u,p=a[c];void 0===p&&(o.push(u),p=o.length-1,a[c]=p),t.writeVarint(p);}}function A(e,t){return (t<<3)+(7&e)}function B(e){return e<<1^e>>31}function J(e,t){for(var r=e.loadGeometry(),i=e.type,o=0,n=0,a=r.length,s=0;s<a;s++){var l=r[s],u=1;1===i&&(u=l.length),t.writeVarint(A(1,u));for(var h=3===i?l.length-1:l.length,c=0;c<h;c++){1===c&&1!==i&&t.writeVarint(A(2,h-1));var p=l[c].x-o,f=l[c].y-n;t.writeVarint(B(p)),t.writeVarint(B(f)),o+=p,n+=f;}3===i&&t.writeVarint(A(7,1));}}function G(e,t){var r=typeof e;"string"===r?t.writeStringField(1,e):"boolean"===r?t.writeBooleanField(7,e):"number"===r&&(e%1!=0?t.writeDoubleField(3,e):e<0?t.writeSVarintField(6,e):t.writeVarintField(5,e));}function Z(e,t,r,i,o,n){if(!(o-i<=r)){var a=i+o>>1;!function e(t,r,i,o,n,a){for(;n>o;){if(n-o>600){var s=n-o+1,l=i-o+1,u=Math.log(s),h=.5*Math.exp(2*u/3),c=.5*Math.sqrt(u*h*(s-h)/s)*(l-s/2<0?-1:1),p=Math.max(o,Math.floor(i-l*h/s+c)),f=Math.min(n,Math.floor(i+(s-l)*h/s+c));e(t,r,i,p,f,a);}var d=r[2*i+a],g=o,m=n;for(j(t,r,o,i),r[2*n+a]>d&&j(t,r,o,n);g<m;){for(j(t,r,g,m),g++,m--;r[2*g+a]<d;)g++;for(;r[2*m+a]>d;)m--;}r[2*o+a]===d?j(t,r,o,m):j(t,r,++m,n),m<=i&&(o=m+1),i<=m&&(n=m-1);}}(e,t,a,i,o,n%2),Z(e,t,r,i,a-1,n+1),Z(e,t,r,a+1,o,n+1);}}function j(e,t,r,i){Y(e,r,i),Y(t,2*r,2*i),Y(t,2*r+1,2*i+1);}function Y(e,t,r){var i=e[t];e[t]=e[r],e[r]=i;}function V(e,t,r,i){var o=e-r,n=t-i;return o*o+n*n}L.fromVectorTileJs=D,L.fromGeojsonVt=C,L.GeoJSONWrapper=z;var X=function(e){return e[0]},W=function(e){return e[1]},R=function(e,t,r,i,o){void 0===t&&(t=X),void 0===r&&(r=W),void 0===i&&(i=64),void 0===o&&(o=Float64Array),this.nodeSize=i,this.points=e;for(var n=e.length<65536?Uint16Array:Uint32Array,a=this.ids=new n(e.length),s=this.coords=new o(2*e.length),l=0;l<e.length;l++)a[l]=l,s[2*l]=t(e[l]),s[2*l+1]=r(e[l]);Z(a,s,i,0,a.length-1,0);};R.prototype.range=function(e,t,r,i){return function(e,t,r,i,o,n,a){for(var s,l,u=[0,e.length-1,0],h=[];u.length;){var c=u.pop(),p=u.pop(),f=u.pop();if(p-f<=a)for(var d=f;d<=p;d++)s=t[2*d],l=t[2*d+1],s>=r&&s<=o&&l>=i&&l<=n&&h.push(e[d]);else{var g=Math.floor((f+p)/2);s=t[2*g],l=t[2*g+1],s>=r&&s<=o&&l>=i&&l<=n&&h.push(e[g]);var m=(c+1)%2;(0===c?r<=s:i<=l)&&(u.push(f),u.push(g-1),u.push(m)),(0===c?o>=s:n>=l)&&(u.push(g+1),u.push(p),u.push(m));}}return h}(this.ids,this.coords,e,t,r,i,this.nodeSize)},R.prototype.within=function(e,t,r){return function(e,t,r,i,o,n){for(var a=[0,e.length-1,0],s=[],l=o*o;a.length;){var u=a.pop(),h=a.pop(),c=a.pop();if(h-c<=n)for(var p=c;p<=h;p++)V(t[2*p],t[2*p+1],r,i)<=l&&s.push(e[p]);else{var f=Math.floor((c+h)/2),d=t[2*f],g=t[2*f+1];V(d,g,r,i)<=l&&s.push(e[f]);var m=(u+1)%2;(0===u?r-o<=d:i-o<=g)&&(a.push(c),a.push(f-1),a.push(m)),(0===u?r+o>=d:i+o>=g)&&(a.push(f+1),a.push(h),a.push(m));}}return s}(this.ids,this.coords,e,t,r,this.nodeSize)};var q={minZoom:0,maxZoom:16,radius:40,extent:512,nodeSize:64,log:!1,reduce:null,map:function(e){return e}},U=function(e){this.options=re(Object.create(q),e),this.trees=new Array(this.options.maxZoom+1);};function $(e,t,r,i,o){return {x:e,y:t,zoom:1/0,id:r,parentId:-1,numPoints:i,properties:o}}function H(e,t){var r=e.geometry.coordinates,i=r[0],o=r[1];return {x:ee(i),y:te(o),zoom:1/0,index:t,parentId:-1}}function K(e){return {type:"Feature",id:e.id,properties:Q(e),geometry:{type:"Point",coordinates:[(i=e.x,360*(i-.5)),(t=e.y,r=(180-360*t)*Math.PI/180,360*Math.atan(Math.exp(r))/Math.PI-90)]}};var t,r,i;}function Q(e){var t=e.numPoints,r=t>=1e4?Math.round(t/1e3)+"k":t>=1e3?Math.round(t/100)/10+"k":t;return re(re({},e.properties),{cluster:!0,cluster_id:e.id,point_count:t,point_count_abbreviated:r})}function ee(e){return e/360+.5}function te(e){var t=Math.sin(e*Math.PI/180),r=.5-.25*Math.log((1+t)/(1-t))/Math.PI;return r<0?0:r>1?1:r}function re(e,t){for(var r in t)e[r]=t[r];return e}function ie(e){return e.x}function oe(e){return e.y}function ne(e,t,r,i,o,n){var a=o-r,s=n-i;if(0!==a||0!==s){var l=((e-r)*a+(t-i)*s)/(a*a+s*s);l>1?(r=o,i=n):l>0&&(r+=a*l,i+=s*l);}return (a=e-r)*a+(s=t-i)*s}function ae(e,t,r,i){var o={id:void 0===e?null:e,type:t,geometry:r,tags:i,minX:1/0,minY:1/0,maxX:-1/0,maxY:-1/0};return function(e){var t=e.geometry,r=e.type;if("Point"===r||"MultiPoint"===r||"LineString"===r)se(e,t);else if("Polygon"===r||"MultiLineString"===r)for(var i=0;i<t.length;i++)se(e,t[i]);else if("MultiPolygon"===r)for(i=0;i<t.length;i++)for(var o=0;o<t[i].length;o++)se(e,t[i][o]);}(o),o}function se(e,t){for(var r=0;r<t.length;r+=3)e.minX=Math.min(e.minX,t[r]),e.minY=Math.min(e.minY,t[r+1]),e.maxX=Math.max(e.maxX,t[r]),e.maxY=Math.max(e.maxY,t[r+1]);}function le(e,t,r,i){if(t.geometry){var o=t.geometry.coordinates,n=t.geometry.type,a=Math.pow(r.tolerance/((1<<r.maxZoom)*r.extent),2),s=[],l=t.id;if(r.promoteId?l=t.properties[r.promoteId]:r.generateId&&(l=i||0),"Point"===n)ue(o,s);else if("MultiPoint"===n)for(var u=0;u<o.length;u++)ue(o[u],s);else if("LineString"===n)he(o,s,a,!1);else if("MultiLineString"===n){if(r.lineMetrics){for(u=0;u<o.length;u++)s=[],he(o[u],s,a,!1),e.push(ae(l,"LineString",s,t.properties));return}ce(o,s,a,!1);}else if("Polygon"===n)ce(o,s,a,!0);else{if("MultiPolygon"!==n){if("GeometryCollection"===n){for(u=0;u<t.geometry.geometries.length;u++)le(e,{id:l,geometry:t.geometry.geometries[u],properties:t.properties},r,i);return}throw new Error("Input data is not a valid GeoJSON object.")}for(u=0;u<o.length;u++){var h=[];ce(o[u],h,a,!0),s.push(h);}}e.push(ae(l,n,s,t.properties));}}function ue(e,t){t.push(pe(e[0])),t.push(fe(e[1])),t.push(0);}function he(e,t,r,i){for(var o,n,a=0,s=0;s<e.length;s++){var l=pe(e[s][0]),u=fe(e[s][1]);t.push(l),t.push(u),t.push(0),s>0&&(a+=i?(o*u-l*n)/2:Math.sqrt(Math.pow(l-o,2)+Math.pow(u-n,2))),o=l,n=u;}var h=t.length-3;t[2]=1,function e(t,r,i,o){for(var n,a=o,s=i-r>>1,l=i-r,u=t[r],h=t[r+1],c=t[i],p=t[i+1],f=r+3;f<i;f+=3){var d=ne(t[f],t[f+1],u,h,c,p);if(d>a)n=f,a=d;else if(d===a){var g=Math.abs(f-s);g<l&&(n=f,l=g);}}a>o&&(n-r>3&&e(t,r,n,o),t[n+2]=a,i-n>3&&e(t,n,i,o));}(t,0,h,r),t[h+2]=1,t.size=Math.abs(a),t.start=0,t.end=t.size;}function ce(e,t,r,i){for(var o=0;o<e.length;o++){var n=[];he(e[o],n,r,i),t.push(n);}}function pe(e){return e/360+.5}function fe(e){var t=Math.sin(e*Math.PI/180),r=.5-.25*Math.log((1+t)/(1-t))/Math.PI;return r<0?0:r>1?1:r}function de(e,t,r,i,o,n,a,s){if(i/=t,n>=(r/=t)&&a<i)return e;if(a<r||n>=i)return null;for(var l=[],u=0;u<e.length;u++){var h=e[u],c=h.geometry,p=h.type,f=0===o?h.minX:h.minY,d=0===o?h.maxX:h.maxY;if(f>=r&&d<i)l.push(h);else if(!(d<r||f>=i)){var g=[];if("Point"===p||"MultiPoint"===p)ge(c,g,r,i,o);else if("LineString"===p)me(c,g,r,i,o,!1,s.lineMetrics);else if("MultiLineString"===p)ye(c,g,r,i,o,!1);else if("Polygon"===p)ye(c,g,r,i,o,!0);else if("MultiPolygon"===p)for(var m=0;m<c.length;m++){var v=[];ye(c[m],v,r,i,o,!0),v.length&&g.push(v);}if(g.length){if(s.lineMetrics&&"LineString"===p){for(m=0;m<g.length;m++)l.push(ae(h.id,p,g[m],h.tags));continue}"LineString"!==p&&"MultiLineString"!==p||(1===g.length?(p="LineString",g=g[0]):p="MultiLineString"),"Point"!==p&&"MultiPoint"!==p||(p=3===g.length?"Point":"MultiPoint"),l.push(ae(h.id,p,g,h.tags));}}}return l.length?l:null}function ge(e,t,r,i,o){for(var n=0;n<e.length;n+=3){var a=e[n+o];a>=r&&a<=i&&(t.push(e[n]),t.push(e[n+1]),t.push(e[n+2]));}}function me(e,t,r,i,o,n,a){for(var s,l,u=ve(e),h=0===o?we:Se,c=e.start,p=0;p<e.length-3;p+=3){var f=e[p],d=e[p+1],g=e[p+2],m=e[p+3],v=e[p+4],y=0===o?f:d,x=0===o?m:v,w=!1;a&&(s=Math.sqrt(Math.pow(f-m,2)+Math.pow(d-v,2))),y<r?x>r&&(l=h(u,f,d,m,v,r),a&&(u.start=c+s*l)):y>i?x<i&&(l=h(u,f,d,m,v,i),a&&(u.start=c+s*l)):xe(u,f,d,g),x<r&&y>=r&&(l=h(u,f,d,m,v,r),w=!0),x>i&&y<=i&&(l=h(u,f,d,m,v,i),w=!0),!n&&w&&(a&&(u.end=c+s*l),t.push(u),u=ve(e)),a&&(c+=s);}var S=e.length-3;f=e[S],d=e[S+1],g=e[S+2],(y=0===o?f:d)>=r&&y<=i&&xe(u,f,d,g),S=u.length-3,n&&S>=3&&(u[S]!==u[0]||u[S+1]!==u[1])&&xe(u,u[0],u[1],u[2]),u.length&&t.push(u);}function ve(e){var t=[];return t.size=e.size,t.start=e.start,t.end=e.end,t}function ye(e,t,r,i,o,n){for(var a=0;a<e.length;a++)me(e[a],t,r,i,o,n,!1);}function xe(e,t,r,i){e.push(t),e.push(r),e.push(i);}function we(e,t,r,i,o,n){var a=(n-t)/(i-t);return e.push(n),e.push(r+(o-r)*a),e.push(1),a}function Se(e,t,r,i,o,n){var a=(n-r)/(o-r);return e.push(t+(i-t)*a),e.push(n),e.push(1),a}function Me(e,t){for(var r=[],i=0;i<e.length;i++){var o,n=e[i],a=n.type;if("Point"===a||"MultiPoint"===a||"LineString"===a)o=be(n.geometry,t);else if("MultiLineString"===a||"Polygon"===a){o=[];for(var s=0;s<n.geometry.length;s++)o.push(be(n.geometry[s],t));}else if("MultiPolygon"===a)for(o=[],s=0;s<n.geometry.length;s++){for(var l=[],u=0;u<n.geometry[s].length;u++)l.push(be(n.geometry[s][u],t));o.push(l);}r.push(ae(n.id,a,o,n.tags));}return r}function be(e,t){var r=[];r.size=e.size,void 0!==e.start&&(r.start=e.start,r.end=e.end);for(var i=0;i<e.length;i+=3)r.push(e[i]+t,e[i+1],e[i+2]);return r}function ke(e,t){if(e.transformed)return e;var r,i,o,n=1<<e.z,a=e.x,s=e.y;for(r=0;r<e.features.length;r++){var l=e.features[r],u=l.geometry,h=l.type;if(l.geometry=[],1===h)for(i=0;i<u.length;i+=2)l.geometry.push(Ie(u[i],u[i+1],t,n,a,s));else for(i=0;i<u.length;i++){var c=[];for(o=0;o<u[i].length;o+=2)c.push(Ie(u[i][o],u[i][o+1],t,n,a,s));l.geometry.push(c);}}return e.transformed=!0,e}function Ie(e,t,r,i,o,n){return [Math.round(r*(e*i-o)),Math.round(r*(t*i-n))]}function _e(e,t,r,i,o){for(var n=t===o.maxZoom?0:o.tolerance/((1<<t)*o.extent),a={features:[],numPoints:0,numSimplified:0,numFeatures:0,source:null,x:r,y:i,z:t,transformed:!1,minX:2,minY:1,maxX:-1,maxY:0},s=0;s<e.length;s++){a.numFeatures++,Pe(a,e[s],n,o);var l=e[s].minX,u=e[s].minY,h=e[s].maxX,c=e[s].maxY;l<a.minX&&(a.minX=l),u<a.minY&&(a.minY=u),h>a.maxX&&(a.maxX=h),c>a.maxY&&(a.maxY=c);}return a}function Pe(e,t,r,i){var o=t.geometry,n=t.type,a=[];if("Point"===n||"MultiPoint"===n)for(var s=0;s<o.length;s+=3)a.push(o[s]),a.push(o[s+1]),e.numPoints++,e.numSimplified++;else if("LineString"===n)Te(a,o,e,r,!1,!1);else if("MultiLineString"===n||"Polygon"===n)for(s=0;s<o.length;s++)Te(a,o[s],e,r,"Polygon"===n,0===s);else if("MultiPolygon"===n)for(var l=0;l<o.length;l++){var u=o[l];for(s=0;s<u.length;s++)Te(a,u[s],e,r,!0,0===s);}if(a.length){var h=t.tags||null;if("LineString"===n&&i.lineMetrics){for(var c in h={},t.tags)h[c]=t.tags[c];h.mapbox_clip_start=o.start/o.size,h.mapbox_clip_end=o.end/o.size;}var p={geometry:a,type:"Polygon"===n||"MultiPolygon"===n?3:"LineString"===n||"MultiLineString"===n?2:1,tags:h};null!==t.id&&(p.id=t.id),e.features.push(p);}}function Te(e,t,r,i,o,n){var a=i*i;if(i>0&&t.size<(o?a:i))r.numPoints+=t.length/3;else{for(var s=[],l=0;l<t.length;l+=3)(0===i||t[l+2]>a)&&(r.numSimplified++,s.push(t[l]),s.push(t[l+1])),r.numPoints++;o&&function(e,t){for(var r=0,i=0,o=e.length,n=o-2;i<o;n=i,i+=2)r+=(e[i]-e[n])*(e[i+1]+e[n+1]);if(r>0===t)for(i=0,o=e.length;i<o/2;i+=2){var a=e[i],s=e[i+1];e[i]=e[o-2-i],e[i+1]=e[o-1-i],e[o-2-i]=a,e[o-1-i]=s;}}(s,n),e.push(s);}}function Le(e,t){var r=(t=this.options=function(e,t){for(var r in t)e[r]=t[r];return e}(Object.create(this.options),t)).debug;if(r&&console.time("preprocess data"),t.maxZoom<0||t.maxZoom>24)throw new Error("maxZoom should be in the 0-24 range");if(t.promoteId&&t.generateId)throw new Error("promoteId and generateId cannot be used together.");var i=function(e,t){var r=[];if("FeatureCollection"===e.type)for(var i=0;i<e.features.length;i++)le(r,e.features[i],t,i);else"Feature"===e.type?le(r,e,t):le(r,{geometry:e},t);return r}(e,t);this.tiles={},this.tileCoords=[],r&&(console.timeEnd("preprocess data"),console.log("index: maxZoom: %d, maxPoints: %d",t.indexMaxZoom,t.indexMaxPoints),console.time("generate tiles"),this.stats={},this.total=0),(i=function(e,t){var r=t.buffer/t.extent,i=e,o=de(e,1,-1-r,r,0,-1,2,t),n=de(e,1,1-r,2+r,0,-1,2,t);return (o||n)&&(i=de(e,1,-r,1+r,0,-1,2,t)||[],o&&(i=Me(o,1).concat(i)),n&&(i=i.concat(Me(n,-1)))),i}(i,t)).length&&this.splitTile(i,0,0,0),r&&(i.length&&console.log("features: %d, points: %d",this.tiles[0].numFeatures,this.tiles[0].numPoints),console.timeEnd("generate tiles"),console.log("tiles generated:",this.total,JSON.stringify(this.stats)));}function De(e,t,r){return 32*((1<<e)*r+t)+e}function Ce(e,t){var r=e.tileID.canonical;if(!this._geoJSONIndex)return t(null,null);var i=this._geoJSONIndex.getTile(r.z,r.x,r.y);if(!i)return t(null,null);var o=new k(i.features),n=L(o);0===n.byteOffset&&n.byteLength===n.buffer.byteLength||(n=new Uint8Array(n)),t(null,{vectorTile:o,rawData:n.buffer});}U.prototype.load=function(e){var t=this.options,r=t.log,i=t.minZoom,o=t.maxZoom,n=t.nodeSize;r&&console.time("total time");var a="prepare "+e.length+" points";r&&console.time(a),this.points=e;for(var s=[],l=0;l<e.length;l++)e[l].geometry&&s.push(H(e[l],l));this.trees[o+1]=new R(s,ie,oe,n,Float32Array),r&&console.timeEnd(a);for(var u=o;u>=i;u--){var h=+Date.now();s=this._cluster(s,u),this.trees[u]=new R(s,ie,oe,n,Float32Array),r&&console.log("z%d: %d clusters in %dms",u,s.length,+Date.now()-h);}return r&&console.timeEnd("total time"),this},U.prototype.getClusters=function(e,t){var r=((e[0]+180)%360+360)%360-180,i=Math.max(-90,Math.min(90,e[1])),o=180===e[2]?180:((e[2]+180)%360+360)%360-180,n=Math.max(-90,Math.min(90,e[3]));if(e[2]-e[0]>=360)r=-180,o=180;else if(r>o){var a=this.getClusters([r,i,180,n],t),s=this.getClusters([-180,i,o,n],t);return a.concat(s)}for(var l=this.trees[this._limitZoom(t)],u=[],h=0,c=l.range(ee(r),te(n),ee(o),te(i));h<c.length;h+=1){var p=c[h],f=l.points[p];u.push(f.numPoints?K(f):this.points[f.index]);}return u},U.prototype.getChildren=function(e){var t=e>>5,r=e%32,i="No cluster with the specified id.",o=this.trees[r];if(!o)throw new Error(i);var n=o.points[t];if(!n)throw new Error(i);for(var a=this.options.radius/(this.options.extent*Math.pow(2,r-1)),s=[],l=0,u=o.within(n.x,n.y,a);l<u.length;l+=1){var h=u[l],c=o.points[h];c.parentId===e&&s.push(c.numPoints?K(c):this.points[c.index]);}if(0===s.length)throw new Error(i);return s},U.prototype.getLeaves=function(e,t,r){t=t||10,r=r||0;var i=[];return this._appendLeaves(i,e,t,r,0),i},U.prototype.getTile=function(e,t,r){var i=this.trees[this._limitZoom(e)],o=Math.pow(2,e),n=this.options,a=n.extent,s=n.radius/a,l=(r-s)/o,u=(r+1+s)/o,h={features:[]};return this._addTileFeatures(i.range((t-s)/o,l,(t+1+s)/o,u),i.points,t,r,o,h),0===t&&this._addTileFeatures(i.range(1-s/o,l,1,u),i.points,o,r,o,h),t===o-1&&this._addTileFeatures(i.range(0,l,s/o,u),i.points,-1,r,o,h),h.features.length?h:null},U.prototype.getClusterExpansionZoom=function(e){for(var t=e%32-1;t<=this.options.maxZoom;){var r=this.getChildren(e);if(t++,1!==r.length)break;e=r[0].properties.cluster_id;}return t},U.prototype._appendLeaves=function(e,t,r,i,o){for(var n=0,a=this.getChildren(t);n<a.length;n+=1){var s=a[n],l=s.properties;if(l&&l.cluster?o+l.point_count<=i?o+=l.point_count:o=this._appendLeaves(e,l.cluster_id,r,i,o):o<i?o++:e.push(s),e.length===r)break}return o},U.prototype._addTileFeatures=function(e,t,r,i,o,n){for(var a=0,s=e;a<s.length;a+=1){var l=t[s[a]],u={type:1,geometry:[[Math.round(this.options.extent*(l.x*o-r)),Math.round(this.options.extent*(l.y*o-i))]],tags:l.numPoints?Q(l):this.points[l.index].properties},h=l.numPoints?l.id:this.points[l.index].id;void 0!==h&&(u.id=h),n.features.push(u);}},U.prototype._limitZoom=function(e){return Math.max(this.options.minZoom,Math.min(e,this.options.maxZoom+1))},U.prototype._cluster=function(e,t){for(var r=[],i=this.options,o=i.radius,n=i.extent,a=i.reduce,s=o/(n*Math.pow(2,t)),l=0;l<e.length;l++){var u=e[l];if(!(u.zoom<=t)){u.zoom=t;for(var h=this.trees[t+1],c=h.within(u.x,u.y,s),p=u.numPoints||1,f=u.x*p,d=u.y*p,g=a&&p>1?this._map(u,!0):null,m=(l<<5)+(t+1),v=0,y=c;v<y.length;v+=1){var x=y[v],w=h.points[x];if(!(w.zoom<=t)){w.zoom=t;var S=w.numPoints||1;f+=w.x*S,d+=w.y*S,p+=S,w.parentId=m,a&&(g||(g=this._map(u,!0)),a(g,this._map(w)));}}1===p?r.push(u):(u.parentId=m,r.push($(f/p,d/p,m,p,g)));}}return r},U.prototype._map=function(e,t){if(e.numPoints)return t?re({},e.properties):e.properties;var r=this.points[e.index].properties,i=this.options.map(r);return t&&i===r?re({},i):i},Le.prototype.options={maxZoom:14,indexMaxZoom:5,indexMaxPoints:1e5,tolerance:3,extent:4096,buffer:64,lineMetrics:!1,promoteId:null,generateId:!1,debug:0},Le.prototype.splitTile=function(e,t,r,i,o,n,a){for(var s=[e,t,r,i],l=this.options,u=l.debug;s.length;){i=s.pop(),r=s.pop(),t=s.pop(),e=s.pop();var h=1<<t,c=De(t,r,i),p=this.tiles[c];if(!p&&(u>1&&console.time("creation"),p=this.tiles[c]=_e(e,t,r,i,l),this.tileCoords.push({z:t,x:r,y:i}),u)){u>1&&(console.log("tile z%d-%d-%d (features: %d, points: %d, simplified: %d)",t,r,i,p.numFeatures,p.numPoints,p.numSimplified),console.timeEnd("creation"));var f="z"+t;this.stats[f]=(this.stats[f]||0)+1,this.total++;}if(p.source=e,o){if(t===l.maxZoom||t===o)continue;var d=1<<o-t;if(r!==Math.floor(n/d)||i!==Math.floor(a/d))continue}else if(t===l.indexMaxZoom||p.numPoints<=l.indexMaxPoints)continue;if(p.source=null,0!==e.length){u>1&&console.time("clipping");var g,m,v,y,x,w,S=.5*l.buffer/l.extent,M=.5-S,b=.5+S,k=1+S;g=m=v=y=null,x=de(e,h,r-S,r+b,0,p.minX,p.maxX,l),w=de(e,h,r+M,r+k,0,p.minX,p.maxX,l),e=null,x&&(g=de(x,h,i-S,i+b,1,p.minY,p.maxY,l),m=de(x,h,i+M,i+k,1,p.minY,p.maxY,l),x=null),w&&(v=de(w,h,i-S,i+b,1,p.minY,p.maxY,l),y=de(w,h,i+M,i+k,1,p.minY,p.maxY,l),w=null),u>1&&console.timeEnd("clipping"),s.push(g||[],t+1,2*r,2*i),s.push(m||[],t+1,2*r,2*i+1),s.push(v||[],t+1,2*r+1,2*i),s.push(y||[],t+1,2*r+1,2*i+1);}}},Le.prototype.getTile=function(e,t,r){var i=this.options,o=i.extent,n=i.debug;if(e<0||e>24)return null;var a=1<<e,s=De(e,t=(t%a+a)%a,r);if(this.tiles[s])return ke(this.tiles[s],o);n>1&&console.log("drilling down to z%d-%d-%d",e,t,r);for(var l,u=e,h=t,c=r;!l&&u>0;)u--,h=Math.floor(h/2),c=Math.floor(c/2),l=this.tiles[De(u,h,c)];return l&&l.source?(n>1&&console.log("found parent tile z%d-%d-%d",u,h,c),n>1&&console.time("drilling down"),this.splitTile(l.source,u,h,c,e,t,r),n>1&&console.timeEnd("drilling down"),this.tiles[s]?ke(this.tiles[s],o):null):null};var ze=function(t){function r(e,r,i,o){t.call(this,e,r,i,Ce),o&&(this.loadGeoJSON=o);}return t&&(r.__proto__=t),r.prototype=Object.create(t&&t.prototype),r.prototype.constructor=r,r.prototype.loadData=function(e,t){this._pendingCallback&&this._pendingCallback(null,{abandoned:!0}),this._pendingCallback=t,this._pendingLoadDataParams=e,this._state&&"Idle"!==this._state?this._state="NeedsLoadData":(this._state="Coalescing",this._loadData());},r.prototype._loadData=function(){var t=this;if(this._pendingCallback&&this._pendingLoadDataParams){var r=this._pendingCallback,i=this._pendingLoadDataParams;delete this._pendingCallback,delete this._pendingLoadDataParams;var o=!!(i&&i.request&&i.request.collectResourceTiming)&&new l.Performance(i.request);this.loadGeoJSON(i,(function(n,a){if(n||!a)return r(n);if("object"!=typeof a)return r(new Error("Input data given to '"+i.source+"' is not a valid GeoJSON object."));y(a,!0);try{t._geoJSONIndex=i.cluster?new U(function(t){var r=t.superclusterOptions,i=t.clusterProperties;if(!i||!r)return r;for(var o={},n={},a={accumulated:null,zoom:0},s={properties:null},l=Object.keys(i),u=0,h=l;u<h.length;u+=1){var c=h[u],p=i[c],f=p[0],d=p[1],g=e.createExpression(d),m=e.createExpression("string"==typeof f?[f,["accumulated"],["get",c]]:f);o[c]=g.value,n[c]=m.value;}return r.map=function(e){s.properties=e;for(var t={},r=0,i=l;r<i.length;r+=1){var n=i[r];t[n]=o[n].evaluate(a,s);}return t},r.reduce=function(e,t){s.properties=t;for(var r=0,i=l;r<i.length;r+=1){var o=i[r];a.accumulated=e[o],e[o]=n[o].evaluate(a,s);}},r}(i)).load(a.features):function(e,t){return new Le(e,t)}(a,i.geojsonVtOptions);}catch(n){return r(n)}t.loaded={};var s={};if(o){var l=o.finish();l&&(s.resourceTiming={},s.resourceTiming[i.source]=JSON.parse(JSON.stringify(l)));}r(null,s);}));}},r.prototype.coalesce=function(){"Coalescing"===this._state?this._state="Idle":"NeedsLoadData"===this._state&&(this._state="Coalescing",this._loadData());},r.prototype.reloadTile=function(e,r){var i=this.loaded,o=e.uid;return i&&i[o]?t.prototype.reloadTile.call(this,e,r):this.loadTile(e,r)},r.prototype.loadGeoJSON=function(t,r){if(t.request)e.getJSON(t.request,r);else{if("string"!=typeof t.data)return r(new Error("Input data given to '"+t.source+"' is not a valid GeoJSON object."));try{return r(null,JSON.parse(t.data))}catch(e){return r(new Error("Input data given to '"+t.source+"' is not a valid GeoJSON object."))}}},r.prototype.removeSource=function(e,t){this._pendingCallback&&this._pendingCallback(null,{abandoned:!0}),t();},r.prototype.getClusterExpansionZoom=function(e,t){t(null,this._geoJSONIndex.getClusterExpansionZoom(e.clusterId));},r.prototype.getClusterChildren=function(e,t){t(null,this._geoJSONIndex.getChildren(e.clusterId));},r.prototype.getClusterLeaves=function(e,t){t(null,this._geoJSONIndex.getLeaves(e.clusterId,e.limit,e.offset));},r}(c);var Oe=function(t){var r=this;this.self=t,this.actor=new e.Actor(t,this),this.layerIndexes={},this.availableImages={},this.workerSourceTypes={vector:c,geojson:ze},this.workerSources={},this.demWorkerSources={},this.self.registerWorkerSource=function(e,t){if(r.workerSourceTypes[e])throw new Error('Worker source with name "'+e+'" already registered.');r.workerSourceTypes[e]=t;},this.self.registerRTLTextPlugin=function(t){if(e.plugin.isLoaded())throw new Error("RTL text plugin already registered.");e.plugin.applyArabicShaping=t.applyArabicShaping,e.plugin.processBidirectionalText=t.processBidirectionalText,e.plugin.processStyledBidirectionalText=t.processStyledBidirectionalText;};};return Oe.prototype.setReferrer=function(e,t){this.referrer=t;},Oe.prototype.setImages=function(e,t,r){this.availableImages[e]=t,r();},Oe.prototype.setLayers=function(e,t,r){this.getLayerIndex(e).replace(t),r();},Oe.prototype.updateLayers=function(e,t,r){this.getLayerIndex(e).update(t.layers,t.removedIds),r();},Oe.prototype.loadTile=function(e,t,r){this.getWorkerSource(e,t.type,t.source).loadTile(t,r);},Oe.prototype.loadDEMTile=function(e,t,r){this.getDEMWorkerSource(e,t.source).loadTile(t,r);},Oe.prototype.reloadTile=function(e,t,r){this.getWorkerSource(e,t.type,t.source).reloadTile(t,r);},Oe.prototype.abortTile=function(e,t,r){this.getWorkerSource(e,t.type,t.source).abortTile(t,r);},Oe.prototype.removeTile=function(e,t,r){this.getWorkerSource(e,t.type,t.source).removeTile(t,r);},Oe.prototype.removeDEMTile=function(e,t){this.getDEMWorkerSource(e,t.source).removeTile(t);},Oe.prototype.removeSource=function(e,t,r){if(this.workerSources[e]&&this.workerSources[e][t.type]&&this.workerSources[e][t.type][t.source]){var i=this.workerSources[e][t.type][t.source];delete this.workerSources[e][t.type][t.source],void 0!==i.removeSource?i.removeSource(t,r):r();}},Oe.prototype.loadWorkerSource=function(e,t,r){try{this.self.importScripts(t.url),r();}catch(e){r(e.toString());}},Oe.prototype.loadRTLTextPlugin=function(t,r,i){try{e.plugin.isLoaded()||(this.self.importScripts(r),i(e.plugin.isLoaded()?null:new Error("RTL Text Plugin failed to import scripts from "+r)));}catch(e){i(e.toString());}},Oe.prototype.getAvailableImages=function(e){var t=this.availableImages[e];return t||(t=[]),t},Oe.prototype.getLayerIndex=function(e){var t=this.layerIndexes[e];return t||(t=this.layerIndexes[e]=new i),t},Oe.prototype.getWorkerSource=function(e,t,r){var i=this;if(this.workerSources[e]||(this.workerSources[e]={}),this.workerSources[e][t]||(this.workerSources[e][t]={}),!this.workerSources[e][t][r]){var o={send:function(t,r,o){i.actor.send(t,r,o,e);}};this.workerSources[e][t][r]=new this.workerSourceTypes[t](o,this.getLayerIndex(e),this.getAvailableImages(e));}return this.workerSources[e][t][r]},Oe.prototype.getDEMWorkerSource=function(e,t){return this.demWorkerSources[e]||(this.demWorkerSources[e]={}),this.demWorkerSources[e][t]||(this.demWorkerSources[e][t]=new p),this.demWorkerSources[e][t]},Oe.prototype.enforceCacheSizeLimit=function(t,r){e.enforceCacheSizeLimit(r);},"undefined"!=typeof WorkerGlobalScope&&void 0!==e.window&&e.window instanceof WorkerGlobalScope&&(e.window.worker=new Oe(e.window)),Oe}));

  define(["./shared"],(function(t){var e=t.createCommonjsModule((function(t){function e(t){return !!("undefined"!=typeof window&&"undefined"!=typeof document&&Array.prototype&&Array.prototype.every&&Array.prototype.filter&&Array.prototype.forEach&&Array.prototype.indexOf&&Array.prototype.lastIndexOf&&Array.prototype.map&&Array.prototype.some&&Array.prototype.reduce&&Array.prototype.reduceRight&&Array.isArray&&Function.prototype&&Function.prototype.bind&&Object.keys&&Object.create&&Object.getPrototypeOf&&Object.getOwnPropertyNames&&Object.isSealed&&Object.isFrozen&&Object.isExtensible&&Object.getOwnPropertyDescriptor&&Object.defineProperty&&Object.defineProperties&&Object.seal&&Object.freeze&&Object.preventExtensions&&"JSON"in window&&"parse"in JSON&&"stringify"in JSON&&function(){if(!("Worker"in window&&"Blob"in window&&"URL"in window))return !1;var t,e,i=new Blob([""],{type:"text/javascript"}),o=URL.createObjectURL(i);try{e=new Worker(o),t=!0;}catch(e){t=!1;}e&&e.terminate();return URL.revokeObjectURL(o),t}()&&"Uint8ClampedArray"in window&&ArrayBuffer.isView&&function(t){void 0===i[t]&&(i[t]=function(t){var i=document.createElement("canvas"),o=Object.create(e.webGLContextAttributes);return o.failIfMajorPerformanceCaveat=t,i.probablySupportsContext?i.probablySupportsContext("webgl",o)||i.probablySupportsContext("experimental-webgl",o):i.supportsContext?i.supportsContext("webgl",o)||i.supportsContext("experimental-webgl",o):i.getContext("webgl",o)||i.getContext("experimental-webgl",o)}(t));return i[t]}(t&&t.failIfMajorPerformanceCaveat))}t.exports?t.exports=e:window&&(window.mapboxgl=window.mapboxgl||{},window.mapboxgl.supported=e);var i={};e.webGLContextAttributes={antialias:!1,alpha:!0,stencil:!0,depth:!0};})),i={create:function(e,i,o){var r=t.window.document.createElement(e);return void 0!==i&&(r.className=i),o&&o.appendChild(r),r},createNS:function(e,i){return t.window.document.createElementNS(e,i)}},o=t.window.document.documentElement.style;function r(t){if(!o)return t[0];for(var e=0;e<t.length;e++)if(t[e]in o)return t[e];return t[0]}var a,n=r(["userSelect","MozUserSelect","WebkitUserSelect","msUserSelect"]);i.disableDrag=function(){o&&n&&(a=o[n],o[n]="none");},i.enableDrag=function(){o&&n&&(o[n]=a);};var s=r(["transform","WebkitTransform"]);i.setTransform=function(t,e){t.style[s]=e;};var l=!1;try{var c=Object.defineProperty({},"passive",{get:function(){l=!0;}});t.window.addEventListener("test",c,c),t.window.removeEventListener("test",c,c);}catch(t){l=!1;}i.addEventListener=function(t,e,i,o){void 0===o&&(o={}),"passive"in o&&l?t.addEventListener(e,i,o):t.addEventListener(e,i,o.capture);},i.removeEventListener=function(t,e,i,o){void 0===o&&(o={}),"passive"in o&&l?t.removeEventListener(e,i,o):t.removeEventListener(e,i,o.capture);};var u=function(e){e.preventDefault(),e.stopPropagation(),t.window.removeEventListener("click",u,!0);};function h(t){var e=t.userImage;if(e&&e.render&&e.render())return t.data.replace(new Uint8Array(e.data.buffer)),!0;return !1}i.suppressClick=function(){t.window.addEventListener("click",u,!0),t.window.setTimeout((function(){t.window.removeEventListener("click",u,!0);}),0);},i.mousePos=function(e,i){var o=e.getBoundingClientRect(),r=t.window.TouchEvent&&i instanceof t.window.TouchEvent?i.touches[0]:i;return new t.Point(r.clientX-o.left-e.clientLeft,r.clientY-o.top-e.clientTop)},i.touchPos=function(e,i){for(var o=e.getBoundingClientRect(),r=[],a="touchend"===i.type?i.changedTouches:i.touches,n=0;n<a.length;n++)r.push(new t.Point(a[n].clientX-o.left-e.clientLeft,a[n].clientY-o.top-e.clientTop));return r},i.mouseButton=function(e){return void 0!==t.window.InstallTrigger&&2===e.button&&e.ctrlKey&&t.window.navigator.platform.toUpperCase().indexOf("MAC")>=0?0:e.button},i.remove=function(t){t.parentNode&&t.parentNode.removeChild(t);};var p=function(e){function i(){e.call(this),this.images={},this.updatedImages={},this.callbackDispatchedThisFrame={},this.loaded=!1,this.requestors=[],this.patterns={},this.atlasImage=new t.RGBAImage({width:1,height:1}),this.dirty=!0;}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.isLoaded=function(){return this.loaded},i.prototype.setLoaded=function(t){if(this.loaded!==t&&(this.loaded=t,t)){for(var e=0,i=this.requestors;e<i.length;e+=1){var o=i[e],r=o.ids,a=o.callback;this._notify(r,a);}this.requestors=[];}},i.prototype.getImage=function(t){return this.images[t]},i.prototype.addImage=function(t,e){this.images[t]=e;},i.prototype.updateImage=function(t,e){var i=this.images[t];e.version=i.version+1,this.images[t]=e,this.updatedImages[t]=!0;},i.prototype.removeImage=function(t){var e=this.images[t];delete this.images[t],delete this.patterns[t],e.userImage&&e.userImage.onRemove&&e.userImage.onRemove();},i.prototype.listImages=function(){return Object.keys(this.images)},i.prototype.getImages=function(t,e){var i=!0;if(!this.isLoaded())for(var o=0,r=t;o<r.length;o+=1){var a=r[o];this.images[a]||(i=!1);}this.isLoaded()||i?this._notify(t,e):this.requestors.push({ids:t,callback:e});},i.prototype._notify=function(e,i){for(var o={},r=0,a=e;r<a.length;r+=1){var n=a[r];this.images[n]||this.fire(new t.Event("styleimagemissing",{id:n}));var s=this.images[n];s?o[n]={data:s.data.clone(),pixelRatio:s.pixelRatio,sdf:s.sdf,version:s.version,hasRenderCallback:Boolean(s.userImage&&s.userImage.render)}:t.warnOnce('Image "'+n+'" could not be loaded. Please make sure you have added the image with map.addImage() or a "sprite" property in your style. You can provide missing images by listening for the "styleimagemissing" map event.');}i(null,o);},i.prototype.getPixelSize=function(){var t=this.atlasImage;return {width:t.width,height:t.height}},i.prototype.getPattern=function(e){var i=this.patterns[e],o=this.getImage(e);if(!o)return null;if(i&&i.position.version===o.version)return i.position;if(i)i.position.version=o.version;else{var r={w:o.data.width+2,h:o.data.height+2,x:0,y:0},a=new t.ImagePosition(r,o);this.patterns[e]={bin:r,position:a};}return this._updatePatternAtlas(),this.patterns[e].position},i.prototype.bind=function(e){var i=e.gl;this.atlasTexture?this.dirty&&(this.atlasTexture.update(this.atlasImage),this.dirty=!1):this.atlasTexture=new t.Texture(e,this.atlasImage,i.RGBA),this.atlasTexture.bind(i.LINEAR,i.CLAMP_TO_EDGE);},i.prototype._updatePatternAtlas=function(){var e=[];for(var i in this.patterns)e.push(this.patterns[i].bin);var o=t.potpack(e),r=o.w,a=o.h,n=this.atlasImage;for(var s in n.resize({width:r||1,height:a||1}),this.patterns){var l=this.patterns[s].bin,c=l.x+1,u=l.y+1,h=this.images[s].data,p=h.width,d=h.height;t.RGBAImage.copy(h,n,{x:0,y:0},{x:c,y:u},{width:p,height:d}),t.RGBAImage.copy(h,n,{x:0,y:d-1},{x:c,y:u-1},{width:p,height:1}),t.RGBAImage.copy(h,n,{x:0,y:0},{x:c,y:u+d},{width:p,height:1}),t.RGBAImage.copy(h,n,{x:p-1,y:0},{x:c-1,y:u},{width:1,height:d}),t.RGBAImage.copy(h,n,{x:0,y:0},{x:c+p,y:u},{width:1,height:d});}this.dirty=!0;},i.prototype.beginFrame=function(){this.callbackDispatchedThisFrame={};},i.prototype.dispatchRenderCallbacks=function(t){for(var e=0,i=t;e<i.length;e+=1){var o=i[e];if(!this.callbackDispatchedThisFrame[o]){this.callbackDispatchedThisFrame[o]=!0;var r=this.images[o];h(r)&&this.updateImage(o,r);}}},i}(t.Evented);var d=m,_=m,f=1e20;function m(t,e,i,o,r,a){this.fontSize=t||24,this.buffer=void 0===e?3:e,this.cutoff=o||.25,this.fontFamily=r||"sans-serif",this.fontWeight=a||"normal",this.radius=i||8;var n=this.size=this.fontSize+2*this.buffer;this.canvas=document.createElement("canvas"),this.canvas.width=this.canvas.height=n,this.ctx=this.canvas.getContext("2d"),this.ctx.font=this.fontWeight+" "+this.fontSize+"px "+this.fontFamily,this.ctx.textBaseline="middle",this.ctx.fillStyle="black",this.gridOuter=new Float64Array(n*n),this.gridInner=new Float64Array(n*n),this.f=new Float64Array(n),this.d=new Float64Array(n),this.z=new Float64Array(n+1),this.v=new Int16Array(n),this.middle=Math.round(n/2*(navigator.userAgent.indexOf("Gecko/")>=0?1.2:1));}function g(t,e,i,o,r,a,n){for(var s=0;s<e;s++){for(var l=0;l<i;l++)o[l]=t[l*e+s];for(v(o,r,a,n,i),l=0;l<i;l++)t[l*e+s]=r[l];}for(l=0;l<i;l++){for(s=0;s<e;s++)o[s]=t[l*e+s];for(v(o,r,a,n,e),s=0;s<e;s++)t[l*e+s]=Math.sqrt(r[s]);}}function v(t,e,i,o,r){i[0]=0,o[0]=-f,o[1]=+f;for(var a=1,n=0;a<r;a++){for(var s=(t[a]+a*a-(t[i[n]]+i[n]*i[n]))/(2*a-2*i[n]);s<=o[n];)n--,s=(t[a]+a*a-(t[i[n]]+i[n]*i[n]))/(2*a-2*i[n]);i[++n]=a,o[n]=s,o[n+1]=+f;}for(a=0,n=0;a<r;a++){for(;o[n+1]<a;)n++;e[a]=(a-i[n])*(a-i[n])+t[i[n]];}}m.prototype.draw=function(t){this.ctx.clearRect(0,0,this.size,this.size),this.ctx.fillText(t,this.buffer,this.middle);for(var e=this.ctx.getImageData(0,0,this.size,this.size),i=new Uint8ClampedArray(this.size*this.size),o=0;o<this.size*this.size;o++){var r=e.data[4*o+3]/255;this.gridOuter[o]=1===r?0:0===r?f:Math.pow(Math.max(0,.5-r),2),this.gridInner[o]=1===r?f:0===r?0:Math.pow(Math.max(0,r-.5),2);}for(g(this.gridOuter,this.size,this.size,this.f,this.d,this.v,this.z),g(this.gridInner,this.size,this.size,this.f,this.d,this.v,this.z),o=0;o<this.size*this.size;o++){var a=this.gridOuter[o]-this.gridInner[o];i[o]=Math.max(0,Math.min(255,Math.round(255-255*(a/this.radius+this.cutoff))));}return i},d.default=_;var y=function(t,e){this.requestManager=t,this.localIdeographFontFamily=e,this.entries={};};y.prototype.setURL=function(t){this.url=t;},y.prototype.getGlyphs=function(e,i){var o=this,r=[];for(var a in e)for(var n=0,s=e[a];n<s.length;n+=1){var l=s[n];r.push({stack:a,id:l});}t.asyncAll(r,(function(t,e){var i=t.stack,r=t.id,a=o.entries[i];a||(a=o.entries[i]={glyphs:{},requests:{}});var n=a.glyphs[r];if(void 0===n){if(n=o._tinySDF(a,i,r))return a.glyphs[r]=n,void e(null,{stack:i,id:r,glyph:n});var s=Math.floor(r/256);if(256*s>65535)e(new Error("glyphs > 65535 not supported"));else{var l=a.requests[s];l||(l=a.requests[s]=[],y.loadGlyphRange(i,s,o.url,o.requestManager,(function(t,e){if(e)for(var i in e)o._doesCharSupportLocalGlyph(+i)||(a.glyphs[+i]=e[+i]);for(var r=0,n=l;r<n.length;r+=1){(0, n[r])(t,e);}delete a.requests[s];}))),l.push((function(t,o){t?e(t):o&&e(null,{stack:i,id:r,glyph:o[r]||null});}));}}else e(null,{stack:i,id:r,glyph:n});}),(function(t,e){if(t)i(t);else if(e){for(var o={},r=0,a=e;r<a.length;r+=1){var n=a[r],s=n.stack,l=n.id,c=n.glyph;(o[s]||(o[s]={}))[l]=c&&{id:c.id,bitmap:c.bitmap.clone(),metrics:c.metrics};}i(null,o);}}));},y.prototype._doesCharSupportLocalGlyph=function(e){return !!this.localIdeographFontFamily&&(t.isChar["CJK Unified Ideographs"](e)||t.isChar["Hangul Syllables"](e)||t.isChar.Hiragana(e)||t.isChar.Katakana(e))},y.prototype._tinySDF=function(e,i,o){var r=this.localIdeographFontFamily;if(r&&this._doesCharSupportLocalGlyph(o)){var a=e.tinySDF;if(!a){var n="400";/bold/i.test(i)?n="900":/medium/i.test(i)?n="500":/light/i.test(i)&&(n="200"),a=e.tinySDF=new y.TinySDF(24,3,8,.25,r,n);}return {id:o,bitmap:new t.AlphaImage({width:30,height:30},a.draw(String.fromCharCode(o))),metrics:{width:24,height:24,left:0,top:-8,advance:24}}}},y.loadGlyphRange=function(e,i,o,r,a){var n=256*i,s=n+255,l=r.transformRequest(r.normalizeGlyphsURL(o).replace("{fontstack}",e).replace("{range}",n+"-"+s),t.ResourceType.Glyphs);t.getArrayBuffer(l,(function(e,i){if(e)a(e);else if(i){for(var o={},r=0,n=t.parseGlyphPBF(i);r<n.length;r+=1){var s=n[r];o[s.id]=s;}a(null,o);}}));},y.TinySDF=d;var x=function(){this.specification=t.styleSpec.light.position;};x.prototype.possiblyEvaluate=function(e,i){return t.sphericalToCartesian(e.expression.evaluate(i))},x.prototype.interpolate=function(e,i,o){return {x:t.number(e.x,i.x,o),y:t.number(e.y,i.y,o),z:t.number(e.z,i.z,o)}};var b=new t.Properties({anchor:new t.DataConstantProperty(t.styleSpec.light.anchor),position:new x,color:new t.DataConstantProperty(t.styleSpec.light.color),intensity:new t.DataConstantProperty(t.styleSpec.light.intensity)}),w=function(e){function i(i){e.call(this),this._transitionable=new t.Transitionable(b),this.setLight(i),this._transitioning=this._transitionable.untransitioned();}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.getLight=function(){return this._transitionable.serialize()},i.prototype.setLight=function(e,i){if(void 0===i&&(i={}),!this._validate(t.validateLight,e,i))for(var o in e){var r=e[o];t.endsWith(o,"-transition")?this._transitionable.setTransition(o.slice(0,-"-transition".length),r):this._transitionable.setValue(o,r);}},i.prototype.updateTransitions=function(t){this._transitioning=this._transitionable.transitioned(t,this._transitioning);},i.prototype.hasTransition=function(){return this._transitioning.hasTransition()},i.prototype.recalculate=function(t){this.properties=this._transitioning.possiblyEvaluate(t);},i.prototype._validate=function(e,i,o){return (!o||!1!==o.validate)&&t.emitValidationErrors(this,e.call(t.validateStyle,t.extend({value:i,style:{glyphs:!0,sprite:!0},styleSpec:t.styleSpec})))},i}(t.Evented),E=function(t,e){this.width=t,this.height=e,this.nextRow=0,this.bytes=4,this.data=new Uint8Array(this.width*this.height*this.bytes),this.positions={};};E.prototype.getDash=function(t,e){var i=t.join(",")+String(e);return this.positions[i]||(this.positions[i]=this.addDash(t,e)),this.positions[i]},E.prototype.addDash=function(e,i){var o=i?7:0,r=2*o+1;if(this.nextRow+r>this.height)return t.warnOnce("LineAtlas out of space"),null;for(var a=0,n=0;n<e.length;n++)a+=e[n];for(var s=this.width/a,l=s/2,c=e.length%2==1,u=-o;u<=o;u++)for(var h=this.nextRow+o+u,p=this.width*h,d=c?-e[e.length-1]:0,_=e[0],f=1,m=0;m<this.width;m++){for(;_<m/s;)d=_,_+=e[f],c&&f===e.length-1&&(_+=e[0]),f++;var g=Math.abs(m-d*s),v=Math.abs(m-_*s),y=Math.min(g,v),x=f%2==1,b=void 0;if(i){var w=o?u/o*(l+1):0;if(x){var E=l-Math.abs(w);b=Math.sqrt(y*y+E*E);}else b=l-Math.sqrt(y*y+w*w);}else b=(x?1:-1)*y;this.data[3+4*(p+m)]=Math.max(0,Math.min(255,b+128));}var T={y:(this.nextRow+o+.5)/this.height,height:2*o/this.height,width:a};return this.nextRow+=r,this.dirty=!0,T},E.prototype.bind=function(t){var e=t.gl;this.texture?(e.bindTexture(e.TEXTURE_2D,this.texture),this.dirty&&(this.dirty=!1,e.texSubImage2D(e.TEXTURE_2D,0,0,0,this.width,this.height,e.RGBA,e.UNSIGNED_BYTE,this.data))):(this.texture=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,this.width,this.height,0,e.RGBA,e.UNSIGNED_BYTE,this.data));};var T=function e(i,o){this.workerPool=i,this.actors=[],this.currentActor=0,this.id=t.uniqueId();for(var r=this.workerPool.acquire(this.id),a=0;a<r.length;a++){var n=r[a],s=new e.Actor(n,o,this.id);s.name="Worker "+a,this.actors.push(s);}};function I(e,i,o){var r=function(r,a){if(r)return o(r);if(a){var n=t.pick(t.extend(a,e),["tiles","minzoom","maxzoom","attribution","mapbox_logo","bounds","scheme","tileSize","encoding"]);a.vector_layers&&(n.vectorLayers=a.vector_layers,n.vectorLayerIds=n.vectorLayers.map((function(t){return t.id}))),e.url&&(n.tiles=i.canonicalizeTileset(n,e.url)),o(null,n);}};return e.url?t.getJSON(i.transformRequest(i.normalizeSourceURL(e.url),t.ResourceType.Source),r):t.browser.frame((function(){return r(null,e)}))}T.prototype.broadcast=function(e,i,o){o=o||function(){},t.asyncAll(this.actors,(function(t,o){t.send(e,i,o);}),o);},T.prototype.getActor=function(){return this.currentActor=(this.currentActor+1)%this.actors.length,this.actors[this.currentActor]},T.prototype.remove=function(){this.actors.forEach((function(t){t.remove();})),this.actors=[],this.workerPool.release(this.id);},T.Actor=t.Actor;var C=function(e,i,o){this.bounds=t.LngLatBounds.convert(this.validateBounds(e)),this.minzoom=i||0,this.maxzoom=o||24;};C.prototype.validateBounds=function(t){return Array.isArray(t)&&4===t.length?[Math.max(-180,t[0]),Math.max(-90,t[1]),Math.min(180,t[2]),Math.min(90,t[3])]:[-180,-90,180,90]},C.prototype.contains=function(e){var i=Math.pow(2,e.z),o=Math.floor(t.mercatorXfromLng(this.bounds.getWest())*i),r=Math.floor(t.mercatorYfromLat(this.bounds.getNorth())*i),a=Math.ceil(t.mercatorXfromLng(this.bounds.getEast())*i),n=Math.ceil(t.mercatorYfromLat(this.bounds.getSouth())*i);return e.x>=o&&e.x<a&&e.y>=r&&e.y<n};var S=function(e){function i(i,o,r,a){if(e.call(this),this.id=i,this.dispatcher=r,this.type="vector",this.minzoom=0,this.maxzoom=22,this.scheme="xyz",this.tileSize=512,this.reparseOverscaled=!0,this.isTileClipped=!0,this._loaded=!1,t.extend(this,t.pick(o,["url","scheme","tileSize"])),this._options=t.extend({type:"vector"},o),this._collectResourceTiming=o.collectResourceTiming,512!==this.tileSize)throw new Error("vector tile sources must have a tileSize of 512");this.setEventedParent(a);}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(){var e=this;this._loaded=!1,this.fire(new t.Event("dataloading",{dataType:"source"})),this._tileJSONRequest=I(this._options,this.map._requestManager,(function(i,o){e._tileJSONRequest=null,e._loaded=!0,i?e.fire(new t.ErrorEvent(i)):o&&(t.extend(e,o),o.bounds&&(e.tileBounds=new C(o.bounds,e.minzoom,e.maxzoom)),t.postTurnstileEvent(o.tiles,e.map._requestManager._customAccessToken),t.postMapLoadEvent(o.tiles,e.map._getMapId(),e.map._requestManager._skuToken,e.map._requestManager._customAccessToken),e.fire(new t.Event("data",{dataType:"source",sourceDataType:"metadata"})),e.fire(new t.Event("data",{dataType:"source",sourceDataType:"content"})));}));},i.prototype.loaded=function(){return this._loaded},i.prototype.hasTile=function(t){return !this.tileBounds||this.tileBounds.contains(t.canonical)},i.prototype.onAdd=function(t){this.map=t,this.load();},i.prototype.onRemove=function(){this._tileJSONRequest&&(this._tileJSONRequest.cancel(),this._tileJSONRequest=null);},i.prototype.serialize=function(){return t.extend({},this._options)},i.prototype.loadTile=function(e,i){var o=this.map._requestManager.normalizeTileURL(e.tileID.canonical.url(this.tiles,this.scheme),this.url,null),r={request:this.map._requestManager.transformRequest(o,t.ResourceType.Tile),uid:e.uid,tileID:e.tileID,zoom:e.tileID.overscaledZ,tileSize:this.tileSize*e.tileID.overscaleFactor(),type:this.type,source:this.id,pixelRatio:t.browser.devicePixelRatio,showCollisionBoxes:this.map.showCollisionBoxes};function a(o,r){return delete e.request,e.aborted?i(null):o&&404!==o.status?i(o):(r&&r.resourceTiming&&(e.resourceTiming=r.resourceTiming),this.map._refreshExpiredTiles&&r&&e.setExpiryData(r),e.loadVectorData(r,this.map.painter),t.cacheEntryPossiblyAdded(this.dispatcher),i(null),void(e.reloadCallback&&(this.loadTile(e,e.reloadCallback),e.reloadCallback=null)))}r.request.collectResourceTiming=this._collectResourceTiming,e.actor&&"expired"!==e.state?"loading"===e.state?e.reloadCallback=i:e.request=e.actor.send("reloadTile",r,a.bind(this)):(e.actor=this.dispatcher.getActor(),e.request=e.actor.send("loadTile",r,a.bind(this)));},i.prototype.abortTile=function(t){t.request&&(t.request.cancel(),delete t.request),t.actor&&t.actor.send("abortTile",{uid:t.uid,type:this.type,source:this.id},void 0);},i.prototype.unloadTile=function(t){t.unloadVectorData(),t.actor&&t.actor.send("removeTile",{uid:t.uid,type:this.type,source:this.id},void 0);},i.prototype.hasTransition=function(){return !1},i}(t.Evented),P=function(e){function i(i,o,r,a){e.call(this),this.id=i,this.dispatcher=r,this.setEventedParent(a),this.type="raster",this.minzoom=0,this.maxzoom=22,this.roundZoom=!0,this.scheme="xyz",this.tileSize=512,this._loaded=!1,this._options=t.extend({type:"raster"},o),t.extend(this,t.pick(o,["url","scheme","tileSize"]));}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(){var e=this;this._loaded=!1,this.fire(new t.Event("dataloading",{dataType:"source"})),this._tileJSONRequest=I(this._options,this.map._requestManager,(function(i,o){e._tileJSONRequest=null,e._loaded=!0,i?e.fire(new t.ErrorEvent(i)):o&&(t.extend(e,o),o.bounds&&(e.tileBounds=new C(o.bounds,e.minzoom,e.maxzoom)),t.postTurnstileEvent(o.tiles),t.postMapLoadEvent(o.tiles,e.map._getMapId(),e.map._requestManager._skuToken),e.fire(new t.Event("data",{dataType:"source",sourceDataType:"metadata"})),e.fire(new t.Event("data",{dataType:"source",sourceDataType:"content"})));}));},i.prototype.loaded=function(){return this._loaded},i.prototype.onAdd=function(t){this.map=t,this.load();},i.prototype.onRemove=function(){this._tileJSONRequest&&(this._tileJSONRequest.cancel(),this._tileJSONRequest=null);},i.prototype.serialize=function(){return t.extend({},this._options)},i.prototype.hasTile=function(t){return !this.tileBounds||this.tileBounds.contains(t.canonical)},i.prototype.loadTile=function(e,i){var o=this,r=this.map._requestManager.normalizeTileURL(e.tileID.canonical.url(this.tiles,this.scheme),this.url,this.tileSize);e.request=t.getImage(this.map._requestManager.transformRequest(r,t.ResourceType.Tile),(function(r,a){if(delete e.request,e.aborted)e.state="unloaded",i(null);else if(r)e.state="errored",i(r);else if(a){o.map._refreshExpiredTiles&&e.setExpiryData(a),delete a.cacheControl,delete a.expires;var n=o.map.painter.context,s=n.gl;e.texture=o.map.painter.getTileTexture(a.width),e.texture?e.texture.update(a,{useMipmap:!0}):(e.texture=new t.Texture(n,a,s.RGBA,{useMipmap:!0}),e.texture.bind(s.LINEAR,s.CLAMP_TO_EDGE,s.LINEAR_MIPMAP_NEAREST),n.extTextureFilterAnisotropic&&s.texParameterf(s.TEXTURE_2D,n.extTextureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,n.extTextureFilterAnisotropicMax)),e.state="loaded",t.cacheEntryPossiblyAdded(o.dispatcher),i(null);}}));},i.prototype.abortTile=function(t,e){t.request&&(t.request.cancel(),delete t.request),e();},i.prototype.unloadTile=function(t,e){t.texture&&this.map.painter.saveTileTexture(t.texture),e();},i.prototype.hasTransition=function(){return !1},i}(t.Evented),z=function(e){function i(i,o,r,a){e.call(this,i,o,r,a),this.type="raster-dem",this.maxzoom=22,this._options=t.extend({type:"raster-dem"},o),this.encoding=o.encoding||"mapbox";}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.serialize=function(){return {type:"raster-dem",url:this.url,tileSize:this.tileSize,tiles:this.tiles,bounds:this.bounds,encoding:this.encoding}},i.prototype.loadTile=function(e,i){var o=this.map._requestManager.normalizeTileURL(e.tileID.canonical.url(this.tiles,this.scheme),this.url,this.tileSize);function r(t,o){t&&(e.state="errored",i(t)),o&&(e.dem=o,e.needsHillshadePrepare=!0,e.state="loaded",i(null));}e.request=t.getImage(this.map._requestManager.transformRequest(o,t.ResourceType.Tile),function(o,a){if(delete e.request,e.aborted)e.state="unloaded",i(null);else if(o)e.state="errored",i(o);else if(a){this.map._refreshExpiredTiles&&e.setExpiryData(a),delete a.cacheControl,delete a.expires;var n=t.browser.getImageData(a,1),s={uid:e.uid,coord:e.tileID,source:this.id,rawImageData:n,encoding:this.encoding};e.actor&&"expired"!==e.state||(e.actor=this.dispatcher.getActor(),e.actor.send("loadDEMTile",s,r.bind(this)));}}.bind(this)),e.neighboringTiles=this._getNeighboringTiles(e.tileID);},i.prototype._getNeighboringTiles=function(e){var i=e.canonical,o=Math.pow(2,i.z),r=(i.x-1+o)%o,a=0===i.x?e.wrap-1:e.wrap,n=(i.x+1+o)%o,s=i.x+1===o?e.wrap+1:e.wrap,l={};return l[new t.OverscaledTileID(e.overscaledZ,a,i.z,r,i.y).key]={backfilled:!1},l[new t.OverscaledTileID(e.overscaledZ,s,i.z,n,i.y).key]={backfilled:!1},i.y>0&&(l[new t.OverscaledTileID(e.overscaledZ,a,i.z,r,i.y-1).key]={backfilled:!1},l[new t.OverscaledTileID(e.overscaledZ,e.wrap,i.z,i.x,i.y-1).key]={backfilled:!1},l[new t.OverscaledTileID(e.overscaledZ,s,i.z,n,i.y-1).key]={backfilled:!1}),i.y+1<o&&(l[new t.OverscaledTileID(e.overscaledZ,a,i.z,r,i.y+1).key]={backfilled:!1},l[new t.OverscaledTileID(e.overscaledZ,e.wrap,i.z,i.x,i.y+1).key]={backfilled:!1},l[new t.OverscaledTileID(e.overscaledZ,s,i.z,n,i.y+1).key]={backfilled:!1}),l},i.prototype.unloadTile=function(t){t.demTexture&&this.map.painter.saveTileTexture(t.demTexture),t.fbo&&(t.fbo.destroy(),delete t.fbo),t.dem&&delete t.dem,delete t.neighboringTiles,t.state="unloaded",t.actor&&t.actor.send("removeDEMTile",{uid:t.uid,source:this.id});},i}(P),L=function(e){function i(i,o,r,a){e.call(this),this.id=i,this.type="geojson",this.minzoom=0,this.maxzoom=18,this.tileSize=512,this.isTileClipped=!0,this.reparseOverscaled=!0,this._removed=!1,this._loaded=!1,this.actor=r.getActor(),this.setEventedParent(a),this._data=o.data,this._options=t.extend({},o),this._collectResourceTiming=o.collectResourceTiming,this._resourceTiming=[],void 0!==o.maxzoom&&(this.maxzoom=o.maxzoom),o.type&&(this.type=o.type),o.attribution&&(this.attribution=o.attribution);var n=t.EXTENT/this.tileSize;this.workerOptions=t.extend({source:this.id,cluster:o.cluster||!1,geojsonVtOptions:{buffer:(void 0!==o.buffer?o.buffer:128)*n,tolerance:(void 0!==o.tolerance?o.tolerance:.375)*n,extent:t.EXTENT,maxZoom:this.maxzoom,lineMetrics:o.lineMetrics||!1,generateId:o.generateId||!1},superclusterOptions:{maxZoom:void 0!==o.clusterMaxZoom?Math.min(o.clusterMaxZoom,this.maxzoom-1):this.maxzoom-1,extent:t.EXTENT,radius:(o.clusterRadius||50)*n,log:!1},clusterProperties:o.clusterProperties},o.workerOptions);}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(){var e=this;this.fire(new t.Event("dataloading",{dataType:"source"})),this._updateWorkerData((function(i){if(i)e.fire(new t.ErrorEvent(i));else{var o={dataType:"source",sourceDataType:"metadata"};e._collectResourceTiming&&e._resourceTiming&&e._resourceTiming.length>0&&(o.resourceTiming=e._resourceTiming,e._resourceTiming=[]),e.fire(new t.Event("data",o));}}));},i.prototype.onAdd=function(t){this.map=t,this.load();},i.prototype.setData=function(e){var i=this;return this._data=e,this.fire(new t.Event("dataloading",{dataType:"source"})),this._updateWorkerData((function(e){if(e)i.fire(new t.ErrorEvent(e));else{var o={dataType:"source",sourceDataType:"content"};i._collectResourceTiming&&i._resourceTiming&&i._resourceTiming.length>0&&(o.resourceTiming=i._resourceTiming,i._resourceTiming=[]),i.fire(new t.Event("data",o));}})),this},i.prototype.getClusterExpansionZoom=function(t,e){return this.actor.send("geojson.getClusterExpansionZoom",{clusterId:t,source:this.id},e),this},i.prototype.getClusterChildren=function(t,e){return this.actor.send("geojson.getClusterChildren",{clusterId:t,source:this.id},e),this},i.prototype.getClusterLeaves=function(t,e,i,o){return this.actor.send("geojson.getClusterLeaves",{source:this.id,clusterId:t,limit:e,offset:i},o),this},i.prototype._updateWorkerData=function(e){var i=this;this._loaded=!1;var o=t.extend({},this.workerOptions),r=this._data;"string"==typeof r?(o.request=this.map._requestManager.transformRequest(t.browser.resolveURL(r),t.ResourceType.Source),o.request.collectResourceTiming=this._collectResourceTiming):o.data=JSON.stringify(r),this.actor.send(this.type+".loadData",o,(function(t,r){i._removed||r&&r.abandoned||(i._loaded=!0,r&&r.resourceTiming&&r.resourceTiming[i.id]&&(i._resourceTiming=r.resourceTiming[i.id].slice(0)),i.actor.send(i.type+".coalesce",{source:o.source},null),e(t));}));},i.prototype.loaded=function(){return this._loaded},i.prototype.loadTile=function(e,i){var o=this,r=e.actor?"reloadTile":"loadTile";e.actor=this.actor;var a={type:this.type,uid:e.uid,tileID:e.tileID,zoom:e.tileID.overscaledZ,maxZoom:this.maxzoom,tileSize:this.tileSize,source:this.id,pixelRatio:t.browser.devicePixelRatio,showCollisionBoxes:this.map.showCollisionBoxes};e.request=this.actor.send(r,a,(function(t,a){return delete e.request,e.unloadVectorData(),e.aborted?i(null):t?i(t):(e.loadVectorData(a,o.map.painter,"reloadTile"===r),i(null))}));},i.prototype.abortTile=function(t){t.request&&(t.request.cancel(),delete t.request),t.aborted=!0;},i.prototype.unloadTile=function(t){t.unloadVectorData(),this.actor.send("removeTile",{uid:t.uid,type:this.type,source:this.id});},i.prototype.onRemove=function(){this._removed=!0,this.actor.send("removeSource",{type:this.type,source:this.id});},i.prototype.serialize=function(){return t.extend({},this._options,{type:this.type,data:this._data})},i.prototype.hasTransition=function(){return !1},i}(t.Evented),D=function(e){function i(t,i,o,r){e.call(this),this.id=t,this.dispatcher=o,this.coordinates=i.coordinates,this.type="image",this.minzoom=0,this.maxzoom=22,this.tileSize=512,this.tiles={},this._loaded=!1,this.setEventedParent(r),this.options=i;}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(e,i){var o=this;this._loaded=!1,this.fire(new t.Event("dataloading",{dataType:"source"})),this.url=this.options.url,t.getImage(this.map._requestManager.transformRequest(this.url,t.ResourceType.Image),(function(r,a){o._loaded=!0,r?o.fire(new t.ErrorEvent(r)):a&&(o.image=a,e&&(o.coordinates=e),i&&i(),o._finishLoading());}));},i.prototype.loaded=function(){return this._loaded},i.prototype.updateImage=function(t){var e=this;return this.image&&t.url?(this.options.url=t.url,this.load(t.coordinates,(function(){e.texture=null;})),this):this},i.prototype._finishLoading=function(){this.map&&(this.setCoordinates(this.coordinates),this.fire(new t.Event("data",{dataType:"source",sourceDataType:"metadata"})));},i.prototype.onAdd=function(t){this.map=t,this.load();},i.prototype.setCoordinates=function(e){var i=this;this.coordinates=e;var o=e.map(t.MercatorCoordinate.fromLngLat);this.tileID=function(e){for(var i=1/0,o=1/0,r=-1/0,a=-1/0,n=0,s=e;n<s.length;n+=1){var l=s[n];i=Math.min(i,l.x),o=Math.min(o,l.y),r=Math.max(r,l.x),a=Math.max(a,l.y);}var c=r-i,u=a-o,h=Math.max(c,u),p=Math.max(0,Math.floor(-Math.log(h)/Math.LN2)),d=Math.pow(2,p);return new t.CanonicalTileID(p,Math.floor((i+r)/2*d),Math.floor((o+a)/2*d))}(o),this.minzoom=this.maxzoom=this.tileID.z;var r=o.map((function(t){return i.tileID.getTilePoint(t)._round()}));return this._boundsArray=new t.StructArrayLayout4i8,this._boundsArray.emplaceBack(r[0].x,r[0].y,0,0),this._boundsArray.emplaceBack(r[1].x,r[1].y,t.EXTENT,0),this._boundsArray.emplaceBack(r[3].x,r[3].y,0,t.EXTENT),this._boundsArray.emplaceBack(r[2].x,r[2].y,t.EXTENT,t.EXTENT),this.boundsBuffer&&(this.boundsBuffer.destroy(),delete this.boundsBuffer),this.fire(new t.Event("data",{dataType:"source",sourceDataType:"content"})),this},i.prototype.prepare=function(){if(0!==Object.keys(this.tiles).length&&this.image){var e=this.map.painter.context,i=e.gl;for(var o in this.boundsBuffer||(this.boundsBuffer=e.createVertexBuffer(this._boundsArray,t.rasterBoundsAttributes.members)),this.boundsSegments||(this.boundsSegments=t.SegmentVector.simpleSegment(0,0,4,2)),this.texture||(this.texture=new t.Texture(e,this.image,i.RGBA),this.texture.bind(i.LINEAR,i.CLAMP_TO_EDGE)),this.tiles){var r=this.tiles[o];"loaded"!==r.state&&(r.state="loaded",r.texture=this.texture);}}},i.prototype.loadTile=function(t,e){this.tileID&&this.tileID.equals(t.tileID.canonical)?(this.tiles[String(t.tileID.wrap)]=t,t.buckets={},e(null)):(t.state="errored",e(null));},i.prototype.serialize=function(){return {type:"image",url:this.options.url,coordinates:this.coordinates}},i.prototype.hasTransition=function(){return !1},i}(t.Evented);var M=function(e){function i(t,i,o,r){e.call(this,t,i,o,r),this.roundZoom=!0,this.type="video",this.options=i;}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(){var e=this;this._loaded=!1;var i=this.options;this.urls=[];for(var o=0,r=i.urls;o<r.length;o+=1){var a=r[o];this.urls.push(this.map._requestManager.transformRequest(a,t.ResourceType.Source).url);}t.getVideo(this.urls,(function(i,o){e._loaded=!0,i?e.fire(new t.ErrorEvent(i)):o&&(e.video=o,e.video.loop=!0,e.video.addEventListener("playing",(function(){e.map.triggerRepaint();})),e.map&&e.video.play(),e._finishLoading());}));},i.prototype.pause=function(){this.video&&this.video.pause();},i.prototype.play=function(){this.video&&this.video.play();},i.prototype.seek=function(e){if(this.video){var i=this.video.seekable;e<i.start(0)||e>i.end(0)?this.fire(new t.ErrorEvent(new t.ValidationError("Playback for this video can be set only between the "+i.start(0)+" and "+i.end(0)+"-second mark."))):this.video.currentTime=e;}},i.prototype.getVideo=function(){return this.video},i.prototype.onAdd=function(t){this.map||(this.map=t,this.load(),this.video&&(this.video.play(),this.setCoordinates(this.coordinates)));},i.prototype.prepare=function(){if(!(0===Object.keys(this.tiles).length||this.video.readyState<2)){var e=this.map.painter.context,i=e.gl;for(var o in this.boundsBuffer||(this.boundsBuffer=e.createVertexBuffer(this._boundsArray,t.rasterBoundsAttributes.members)),this.boundsSegments||(this.boundsSegments=t.SegmentVector.simpleSegment(0,0,4,2)),this.texture?this.video.paused||(this.texture.bind(i.LINEAR,i.CLAMP_TO_EDGE),i.texSubImage2D(i.TEXTURE_2D,0,0,0,i.RGBA,i.UNSIGNED_BYTE,this.video)):(this.texture=new t.Texture(e,this.video,i.RGBA),this.texture.bind(i.LINEAR,i.CLAMP_TO_EDGE)),this.tiles){var r=this.tiles[o];"loaded"!==r.state&&(r.state="loaded",r.texture=this.texture);}}},i.prototype.serialize=function(){return {type:"video",urls:this.urls,coordinates:this.coordinates}},i.prototype.hasTransition=function(){return this.video&&!this.video.paused},i}(D),R=function(e){function i(i,o,r,a){e.call(this,i,o,r,a),o.coordinates?Array.isArray(o.coordinates)&&4===o.coordinates.length&&!o.coordinates.some((function(t){return !Array.isArray(t)||2!==t.length||t.some((function(t){return "number"!=typeof t}))}))||this.fire(new t.ErrorEvent(new t.ValidationError("sources."+i,null,'"coordinates" property must be an array of 4 longitude/latitude array pairs'))):this.fire(new t.ErrorEvent(new t.ValidationError("sources."+i,null,'missing required property "coordinates"'))),o.animate&&"boolean"!=typeof o.animate&&this.fire(new t.ErrorEvent(new t.ValidationError("sources."+i,null,'optional "animate" property must be a boolean value'))),o.canvas?"string"==typeof o.canvas||o.canvas instanceof t.window.HTMLCanvasElement||this.fire(new t.ErrorEvent(new t.ValidationError("sources."+i,null,'"canvas" must be either a string representing the ID of the canvas element from which to read, or an HTMLCanvasElement instance'))):this.fire(new t.ErrorEvent(new t.ValidationError("sources."+i,null,'missing required property "canvas"'))),this.options=o,this.animate=void 0===o.animate||o.animate;}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.load=function(){this._loaded=!0,this.canvas||(this.canvas=this.options.canvas instanceof t.window.HTMLCanvasElement?this.options.canvas:t.window.document.getElementById(this.options.canvas)),this.width=this.canvas.width,this.height=this.canvas.height,this._hasInvalidDimensions()?this.fire(new t.ErrorEvent(new Error("Canvas dimensions cannot be less than or equal to zero."))):(this.play=function(){this._playing=!0,this.map.triggerRepaint();},this.pause=function(){this._playing&&(this.prepare(),this._playing=!1);},this._finishLoading());},i.prototype.getCanvas=function(){return this.canvas},i.prototype.onAdd=function(t){this.map=t,this.load(),this.canvas&&this.animate&&this.play();},i.prototype.onRemove=function(){this.pause();},i.prototype.prepare=function(){var e=!1;if(this.canvas.width!==this.width&&(this.width=this.canvas.width,e=!0),this.canvas.height!==this.height&&(this.height=this.canvas.height,e=!0),!this._hasInvalidDimensions()&&0!==Object.keys(this.tiles).length){var i=this.map.painter.context,o=i.gl;for(var r in this.boundsBuffer||(this.boundsBuffer=i.createVertexBuffer(this._boundsArray,t.rasterBoundsAttributes.members)),this.boundsSegments||(this.boundsSegments=t.SegmentVector.simpleSegment(0,0,4,2)),this.texture?(e||this._playing)&&this.texture.update(this.canvas,{premultiply:!0}):this.texture=new t.Texture(i,this.canvas,o.RGBA,{premultiply:!0}),this.tiles){var a=this.tiles[r];"loaded"!==a.state&&(a.state="loaded",a.texture=this.texture);}}},i.prototype.serialize=function(){return {type:"canvas",coordinates:this.coordinates}},i.prototype.hasTransition=function(){return this._playing},i.prototype._hasInvalidDimensions=function(){for(var t=0,e=[this.canvas.width,this.canvas.height];t<e.length;t+=1){var i=e[t];if(isNaN(i)||i<=0)return !0}return !1},i}(D),A={vector:S,raster:P,"raster-dem":z,geojson:L,video:M,image:D,canvas:R},k=function(e,i,o,r){var a=new A[i.type](e,i,o,r);if(a.id!==e)throw new Error("Expected Source id to be "+e+" instead of "+a.id);return t.bindAll(["load","abort","unload","serialize","prepare"],a),a};function B(e,i){var o=t.identity([]);return t.translate(o,o,[1,1,0]),t.scale(o,o,[.5*e.width,.5*e.height,1]),t.multiply(o,o,e.calculatePosMatrix(i.toUnwrapped()))}function O(t,e,i,o,r){var a=function(t,e,i){if(t)for(var o=0,r=t;o<r.length;o+=1){var a=e[r[o]];if(a&&a.source===i&&"fill-extrusion"===a.type)return !0}else for(var n in e){var s=e[n];if(s.source===i&&"fill-extrusion"===s.type)return !0}return !1}(o&&o.layers,e,t.id),n=r.maxPitchScaleFactor(),s=t.tilesIn(i,n,a);s.sort(F);for(var l=[],c=0,u=s;c<u.length;c+=1){var h=u[c];l.push({wrappedTileID:h.tileID.wrapped().key,queryResults:h.tile.queryRenderedFeatures(e,t._state,h.queryGeometry,h.cameraQueryGeometry,h.scale,o,r,n,B(t.transform,h.tileID))});}var p=function(t){for(var e={},i={},o=0,r=t;o<r.length;o+=1){var a=r[o],n=a.queryResults,s=a.wrappedTileID,l=i[s]=i[s]||{};for(var c in n)for(var u=n[c],h=l[c]=l[c]||{},p=e[c]=e[c]||[],d=0,_=u;d<_.length;d+=1){var f=_[d];h[f.featureIndex]||(h[f.featureIndex]=!0,p.push(f));}}return e}(l);for(var d in p)p[d].forEach((function(e){var i=e.feature,o=t.getFeatureState(i.layer["source-layer"],i.id);i.source=i.layer.source,i.layer["source-layer"]&&(i.sourceLayer=i.layer["source-layer"]),i.state=o;}));return p}function F(t,e){var i=t.tileID,o=e.tileID;return i.overscaledZ-o.overscaledZ||i.canonical.y-o.canonical.y||i.wrap-o.wrap||i.canonical.x-o.canonical.x}var U=function(t,e){this.max=t,this.onRemove=e,this.reset();};U.prototype.reset=function(){for(var t in this.data)for(var e=0,i=this.data[t];e<i.length;e+=1){var o=i[e];o.timeout&&clearTimeout(o.timeout),this.onRemove(o.value);}return this.data={},this.order=[],this},U.prototype.add=function(t,e,i){var o=this,r=t.wrapped().key;void 0===this.data[r]&&(this.data[r]=[]);var a={value:e,timeout:void 0};if(void 0!==i&&(a.timeout=setTimeout((function(){o.remove(t,a);}),i)),this.data[r].push(a),this.order.push(r),this.order.length>this.max){var n=this._getAndRemoveByKey(this.order[0]);n&&this.onRemove(n);}return this},U.prototype.has=function(t){return t.wrapped().key in this.data},U.prototype.getAndRemove=function(t){return this.has(t)?this._getAndRemoveByKey(t.wrapped().key):null},U.prototype._getAndRemoveByKey=function(t){var e=this.data[t].shift();return e.timeout&&clearTimeout(e.timeout),0===this.data[t].length&&delete this.data[t],this.order.splice(this.order.indexOf(t),1),e.value},U.prototype.get=function(t){return this.has(t)?this.data[t.wrapped().key][0].value:null},U.prototype.remove=function(t,e){if(!this.has(t))return this;var i=t.wrapped().key,o=void 0===e?0:this.data[i].indexOf(e),r=this.data[i][o];return this.data[i].splice(o,1),r.timeout&&clearTimeout(r.timeout),0===this.data[i].length&&delete this.data[i],this.onRemove(r.value),this.order.splice(this.order.indexOf(i),1),this},U.prototype.setMaxSize=function(t){for(this.max=t;this.order.length>this.max;){var e=this._getAndRemoveByKey(this.order[0]);e&&this.onRemove(e);}return this};var N=function(t,e,i){this.context=t;var o=t.gl;this.buffer=o.createBuffer(),this.dynamicDraw=Boolean(i),this.context.unbindVAO(),t.bindElementBuffer.set(this.buffer),o.bufferData(o.ELEMENT_ARRAY_BUFFER,e.arrayBuffer,this.dynamicDraw?o.DYNAMIC_DRAW:o.STATIC_DRAW),this.dynamicDraw||delete e.arrayBuffer;};N.prototype.bind=function(){this.context.bindElementBuffer.set(this.buffer);},N.prototype.updateData=function(t){var e=this.context.gl;this.context.unbindVAO(),this.bind(),e.bufferSubData(e.ELEMENT_ARRAY_BUFFER,0,t.arrayBuffer);},N.prototype.destroy=function(){var t=this.context.gl;this.buffer&&(t.deleteBuffer(this.buffer),delete this.buffer);};var Z={Int8:"BYTE",Uint8:"UNSIGNED_BYTE",Int16:"SHORT",Uint16:"UNSIGNED_SHORT",Int32:"INT",Uint32:"UNSIGNED_INT",Float32:"FLOAT"},V=function(t,e,i,o){this.length=e.length,this.attributes=i,this.itemSize=e.bytesPerElement,this.dynamicDraw=o,this.context=t;var r=t.gl;this.buffer=r.createBuffer(),t.bindVertexBuffer.set(this.buffer),r.bufferData(r.ARRAY_BUFFER,e.arrayBuffer,this.dynamicDraw?r.DYNAMIC_DRAW:r.STATIC_DRAW),this.dynamicDraw||delete e.arrayBuffer;};V.prototype.bind=function(){this.context.bindVertexBuffer.set(this.buffer);},V.prototype.updateData=function(t){var e=this.context.gl;this.bind(),e.bufferSubData(e.ARRAY_BUFFER,0,t.arrayBuffer);},V.prototype.enableAttributes=function(t,e){for(var i=0;i<this.attributes.length;i++){var o=this.attributes[i],r=e.attributes[o.name];void 0!==r&&t.enableVertexAttribArray(r);}},V.prototype.setVertexAttribPointers=function(t,e,i){for(var o=0;o<this.attributes.length;o++){var r=this.attributes[o],a=e.attributes[r.name];void 0!==a&&t.vertexAttribPointer(a,r.components,t[Z[r.type]],!1,this.itemSize,r.offset+this.itemSize*(i||0));}},V.prototype.destroy=function(){var t=this.context.gl;this.buffer&&(t.deleteBuffer(this.buffer),delete this.buffer);};var q=function(t){this.gl=t.gl,this.default=this.getDefault(),this.current=this.default,this.dirty=!1;};q.prototype.get=function(){return this.current},q.prototype.set=function(t){},q.prototype.getDefault=function(){return this.default},q.prototype.setDefault=function(){this.set(this.default);};var j=function(e){function i(){e.apply(this,arguments);}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.getDefault=function(){return t.Color.transparent},i.prototype.set=function(t){var e=this.current;(t.r!==e.r||t.g!==e.g||t.b!==e.b||t.a!==e.a||this.dirty)&&(this.gl.clearColor(t.r,t.g,t.b,t.a),this.current=t,this.dirty=!1);},i}(q),G=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return 1},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.clearDepth(t),this.current=t,this.dirty=!1);},e}(q),W=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return 0},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.clearStencil(t),this.current=t,this.dirty=!1);},e}(q),X=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return [!0,!0,!0,!0]},e.prototype.set=function(t){var e=this.current;(t[0]!==e[0]||t[1]!==e[1]||t[2]!==e[2]||t[3]!==e[3]||this.dirty)&&(this.gl.colorMask(t[0],t[1],t[2],t[3]),this.current=t,this.dirty=!1);},e}(q),H=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !0},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.depthMask(t),this.current=t,this.dirty=!1);},e}(q),K=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return 255},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.stencilMask(t),this.current=t,this.dirty=!1);},e}(q),J=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return {func:this.gl.ALWAYS,ref:0,mask:255}},e.prototype.set=function(t){var e=this.current;(t.func!==e.func||t.ref!==e.ref||t.mask!==e.mask||this.dirty)&&(this.gl.stencilFunc(t.func,t.ref,t.mask),this.current=t,this.dirty=!1);},e}(q),Y=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){var t=this.gl;return [t.KEEP,t.KEEP,t.KEEP]},e.prototype.set=function(t){var e=this.current;(t[0]!==e[0]||t[1]!==e[1]||t[2]!==e[2]||this.dirty)&&(this.gl.stencilOp(t[0],t[1],t[2]),this.current=t,this.dirty=!1);},e}(q),Q=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;t?e.enable(e.STENCIL_TEST):e.disable(e.STENCIL_TEST),this.current=t,this.dirty=!1;}},e}(q),$=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return [0,1]},e.prototype.set=function(t){var e=this.current;(t[0]!==e[0]||t[1]!==e[1]||this.dirty)&&(this.gl.depthRange(t[0],t[1]),this.current=t,this.dirty=!1);},e}(q),tt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;t?e.enable(e.DEPTH_TEST):e.disable(e.DEPTH_TEST),this.current=t,this.dirty=!1;}},e}(q),et=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return this.gl.LESS},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.depthFunc(t),this.current=t,this.dirty=!1);},e}(q),it=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;t?e.enable(e.BLEND):e.disable(e.BLEND),this.current=t,this.dirty=!1;}},e}(q),ot=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){var t=this.gl;return [t.ONE,t.ZERO]},e.prototype.set=function(t){var e=this.current;(t[0]!==e[0]||t[1]!==e[1]||this.dirty)&&(this.gl.blendFunc(t[0],t[1]),this.current=t,this.dirty=!1);},e}(q),rt=function(e){function i(){e.apply(this,arguments);}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.getDefault=function(){return t.Color.transparent},i.prototype.set=function(t){var e=this.current;(t.r!==e.r||t.g!==e.g||t.b!==e.b||t.a!==e.a||this.dirty)&&(this.gl.blendColor(t.r,t.g,t.b,t.a),this.current=t,this.dirty=!1);},i}(q),at=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return this.gl.FUNC_ADD},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.blendEquation(t),this.current=t,this.dirty=!1);},e}(q),nt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;t?e.enable(e.CULL_FACE):e.disable(e.CULL_FACE),this.current=t,this.dirty=!1;}},e}(q),st=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return this.gl.BACK},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.cullFace(t),this.current=t,this.dirty=!1);},e}(q),lt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return this.gl.CCW},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.frontFace(t),this.current=t,this.dirty=!1);},e}(q),ct=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.useProgram(t),this.current=t,this.dirty=!1);},e}(q),ut=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return this.gl.TEXTURE0},e.prototype.set=function(t){(t!==this.current||this.dirty)&&(this.gl.activeTexture(t),this.current=t,this.dirty=!1);},e}(q),ht=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){var t=this.gl;return [0,0,t.drawingBufferWidth,t.drawingBufferHeight]},e.prototype.set=function(t){var e=this.current;(t[0]!==e[0]||t[1]!==e[1]||t[2]!==e[2]||t[3]!==e[3]||this.dirty)&&(this.gl.viewport(t[0],t[1],t[2],t[3]),this.current=t,this.dirty=!1);},e}(q),pt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,t),this.current=t,this.dirty=!1;}},e}(q),dt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.bindRenderbuffer(e.RENDERBUFFER,t),this.current=t,this.dirty=!1;}},e}(q),_t=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.bindTexture(e.TEXTURE_2D,t),this.current=t,this.dirty=!1;}},e}(q),ft=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.bindBuffer(e.ARRAY_BUFFER,t),this.current=t,this.dirty=!1;}},e}(q),mt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){var e=this.gl;e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),this.current=t,this.dirty=!1;},e}(q),gt=function(t){function e(e){t.call(this,e),this.vao=e.extVertexArrayObject;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e.prototype.set=function(t){this.vao&&(t!==this.current||this.dirty)&&(this.vao.bindVertexArrayOES(t),this.current=t,this.dirty=!1);},e}(q),vt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return 4},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.pixelStorei(e.UNPACK_ALIGNMENT,t),this.current=t,this.dirty=!1;}},e}(q),yt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t),this.current=t,this.dirty=!1;}},e}(q),xt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return !1},e.prototype.set=function(t){if(t!==this.current||this.dirty){var e=this.gl;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,t),this.current=t,this.dirty=!1;}},e}(q),bt=function(t){function e(e,i){t.call(this,e),this.context=e,this.parent=i;}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getDefault=function(){return null},e}(q),wt=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.setDirty=function(){this.dirty=!0;},e.prototype.set=function(t){if(t!==this.current||this.dirty){this.context.bindFramebuffer.set(this.parent);var e=this.gl;e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),this.current=t,this.dirty=!1;}},e}(bt),Et=function(t){function e(){t.apply(this,arguments);}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.set=function(t){if(t!==this.current||this.dirty){this.context.bindFramebuffer.set(this.parent);var e=this.gl;e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,t),this.current=t,this.dirty=!1;}},e}(bt),Tt=function(t,e,i){this.context=t,this.width=e,this.height=i;var o=t.gl,r=this.framebuffer=o.createFramebuffer();this.colorAttachment=new wt(t,r),this.depthAttachment=new Et(t,r);};Tt.prototype.destroy=function(){var t=this.context.gl,e=this.colorAttachment.get();e&&t.deleteTexture(e);var i=this.depthAttachment.get();i&&t.deleteRenderbuffer(i),t.deleteFramebuffer(this.framebuffer);};var It=function(t,e,i){this.func=t,this.mask=e,this.range=i;};It.ReadOnly=!1,It.ReadWrite=!0,It.disabled=new It(519,It.ReadOnly,[0,1]);var Ct=function(t,e,i,o,r,a){this.test=t,this.ref=e,this.mask=i,this.fail=o,this.depthFail=r,this.pass=a;};Ct.disabled=new Ct({func:519,mask:0},0,0,7680,7680,7680);var St=function(t,e,i){this.blendFunction=t,this.blendColor=e,this.mask=i;};St.Replace=[1,0],St.disabled=new St(St.Replace,t.Color.transparent,[!1,!1,!1,!1]),St.unblended=new St(St.Replace,t.Color.transparent,[!0,!0,!0,!0]),St.alphaBlended=new St([1,771],t.Color.transparent,[!0,!0,!0,!0]);var Pt=function(t,e,i){this.enable=t,this.mode=e,this.frontFace=i;};Pt.disabled=new Pt(!1,1029,2305),Pt.backCCW=new Pt(!0,1029,2305);var zt=function(t){this.gl=t,this.extVertexArrayObject=this.gl.getExtension("OES_vertex_array_object"),this.clearColor=new j(this),this.clearDepth=new G(this),this.clearStencil=new W(this),this.colorMask=new X(this),this.depthMask=new H(this),this.stencilMask=new K(this),this.stencilFunc=new J(this),this.stencilOp=new Y(this),this.stencilTest=new Q(this),this.depthRange=new $(this),this.depthTest=new tt(this),this.depthFunc=new et(this),this.blend=new it(this),this.blendFunc=new ot(this),this.blendColor=new rt(this),this.blendEquation=new at(this),this.cullFace=new nt(this),this.cullFaceSide=new st(this),this.frontFace=new lt(this),this.program=new ct(this),this.activeTexture=new ut(this),this.viewport=new ht(this),this.bindFramebuffer=new pt(this),this.bindRenderbuffer=new dt(this),this.bindTexture=new _t(this),this.bindVertexBuffer=new ft(this),this.bindElementBuffer=new mt(this),this.bindVertexArrayOES=this.extVertexArrayObject&&new gt(this),this.pixelStoreUnpack=new vt(this),this.pixelStoreUnpackPremultiplyAlpha=new yt(this),this.pixelStoreUnpackFlipY=new xt(this),this.extTextureFilterAnisotropic=t.getExtension("EXT_texture_filter_anisotropic")||t.getExtension("MOZ_EXT_texture_filter_anisotropic")||t.getExtension("WEBKIT_EXT_texture_filter_anisotropic"),this.extTextureFilterAnisotropic&&(this.extTextureFilterAnisotropicMax=t.getParameter(this.extTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),this.extTextureHalfFloat=t.getExtension("OES_texture_half_float"),this.extTextureHalfFloat&&t.getExtension("OES_texture_half_float_linear");};zt.prototype.setDefault=function(){this.unbindVAO(),this.clearColor.setDefault(),this.clearDepth.setDefault(),this.clearStencil.setDefault(),this.colorMask.setDefault(),this.depthMask.setDefault(),this.stencilMask.setDefault(),this.stencilFunc.setDefault(),this.stencilOp.setDefault(),this.stencilTest.setDefault(),this.depthRange.setDefault(),this.depthTest.setDefault(),this.depthFunc.setDefault(),this.blend.setDefault(),this.blendFunc.setDefault(),this.blendColor.setDefault(),this.blendEquation.setDefault(),this.cullFace.setDefault(),this.cullFaceSide.setDefault(),this.frontFace.setDefault(),this.program.setDefault(),this.activeTexture.setDefault(),this.bindFramebuffer.setDefault(),this.pixelStoreUnpack.setDefault(),this.pixelStoreUnpackPremultiplyAlpha.setDefault(),this.pixelStoreUnpackFlipY.setDefault();},zt.prototype.setDirty=function(){this.clearColor.dirty=!0,this.clearDepth.dirty=!0,this.clearStencil.dirty=!0,this.colorMask.dirty=!0,this.depthMask.dirty=!0,this.stencilMask.dirty=!0,this.stencilFunc.dirty=!0,this.stencilOp.dirty=!0,this.stencilTest.dirty=!0,this.depthRange.dirty=!0,this.depthTest.dirty=!0,this.depthFunc.dirty=!0,this.blend.dirty=!0,this.blendFunc.dirty=!0,this.blendColor.dirty=!0,this.blendEquation.dirty=!0,this.cullFace.dirty=!0,this.cullFaceSide.dirty=!0,this.frontFace.dirty=!0,this.program.dirty=!0,this.activeTexture.dirty=!0,this.viewport.dirty=!0,this.bindFramebuffer.dirty=!0,this.bindRenderbuffer.dirty=!0,this.bindTexture.dirty=!0,this.bindVertexBuffer.dirty=!0,this.bindElementBuffer.dirty=!0,this.extVertexArrayObject&&(this.bindVertexArrayOES.dirty=!0),this.pixelStoreUnpack.dirty=!0,this.pixelStoreUnpackPremultiplyAlpha.dirty=!0,this.pixelStoreUnpackFlipY.dirty=!0;},zt.prototype.createIndexBuffer=function(t,e){return new N(this,t,e)},zt.prototype.createVertexBuffer=function(t,e,i){return new V(this,t,e,i)},zt.prototype.createRenderbuffer=function(t,e,i){var o=this.gl,r=o.createRenderbuffer();return this.bindRenderbuffer.set(r),o.renderbufferStorage(o.RENDERBUFFER,t,e,i),this.bindRenderbuffer.set(null),r},zt.prototype.createFramebuffer=function(t,e){return new Tt(this,t,e)},zt.prototype.clear=function(t){var e=t.color,i=t.depth,o=this.gl,r=0;e&&(r|=o.COLOR_BUFFER_BIT,this.clearColor.set(e),this.colorMask.set([!0,!0,!0,!0])),void 0!==i&&(r|=o.DEPTH_BUFFER_BIT,this.depthRange.set([0,1]),this.clearDepth.set(i),this.depthMask.set(!0)),o.clear(r);},zt.prototype.setCullFace=function(t){!1===t.enable?this.cullFace.set(!1):(this.cullFace.set(!0),this.cullFaceSide.set(t.mode),this.frontFace.set(t.frontFace));},zt.prototype.setDepthMode=function(t){t.func!==this.gl.ALWAYS||t.mask?(this.depthTest.set(!0),this.depthFunc.set(t.func),this.depthMask.set(t.mask),this.depthRange.set(t.range)):this.depthTest.set(!1);},zt.prototype.setStencilMode=function(t){t.test.func!==this.gl.ALWAYS||t.mask?(this.stencilTest.set(!0),this.stencilMask.set(t.mask),this.stencilOp.set([t.fail,t.depthFail,t.pass]),this.stencilFunc.set({func:t.test.func,ref:t.ref,mask:t.test.mask})):this.stencilTest.set(!1);},zt.prototype.setColorMode=function(e){t.deepEqual(e.blendFunction,St.Replace)?this.blend.set(!1):(this.blend.set(!0),this.blendFunc.set(e.blendFunction),this.blendColor.set(e.blendColor)),this.colorMask.set(e.mask);},zt.prototype.unbindVAO=function(){this.extVertexArrayObject&&this.bindVertexArrayOES.set(null);};var Lt=function(e){function i(i,o,r){var a=this;e.call(this),this.id=i,this.dispatcher=r,this.on("data",(function(t){"source"===t.dataType&&"metadata"===t.sourceDataType&&(a._sourceLoaded=!0),a._sourceLoaded&&!a._paused&&"source"===t.dataType&&"content"===t.sourceDataType&&(a.reload(),a.transform&&a.update(a.transform));})),this.on("error",(function(){a._sourceErrored=!0;})),this._source=k(i,o,r,this),this._tiles={},this._cache=new U(0,this._unloadTile.bind(this)),this._timers={},this._cacheTimers={},this._maxTileCacheSize=null,this._coveredTiles={},this._state=new t.SourceFeatureState;}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.onAdd=function(t){this.map=t,this._maxTileCacheSize=t?t._maxTileCacheSize:null,this._source&&this._source.onAdd&&this._source.onAdd(t);},i.prototype.onRemove=function(t){this._source&&this._source.onRemove&&this._source.onRemove(t);},i.prototype.loaded=function(){if(this._sourceErrored)return !0;if(!this._sourceLoaded)return !1;if(!this._source.loaded())return !1;for(var t in this._tiles){var e=this._tiles[t];if("loaded"!==e.state&&"errored"!==e.state)return !1}return !0},i.prototype.getSource=function(){return this._source},i.prototype.pause=function(){this._paused=!0;},i.prototype.resume=function(){if(this._paused){var t=this._shouldReloadOnResume;this._paused=!1,this._shouldReloadOnResume=!1,t&&this.reload(),this.transform&&this.update(this.transform);}},i.prototype._loadTile=function(t,e){return this._source.loadTile(t,e)},i.prototype._unloadTile=function(t){if(this._source.unloadTile)return this._source.unloadTile(t,(function(){}))},i.prototype._abortTile=function(t){if(this._source.abortTile)return this._source.abortTile(t,(function(){}))},i.prototype.serialize=function(){return this._source.serialize()},i.prototype.prepare=function(t){for(var e in this._source.prepare&&this._source.prepare(),this._state.coalesceChanges(this._tiles,this.map?this.map.painter:null),this._tiles){var i=this._tiles[e];i.upload(t),i.prepare(this.map.style.imageManager);}},i.prototype.getIds=function(){return Object.keys(this._tiles).map(Number).sort(Dt)},i.prototype.getRenderableIds=function(e){var i=this,o=[];for(var r in this._tiles)this._isIdRenderable(+r,e)&&o.push(+r);return e?o.sort((function(e,o){var r=i._tiles[e].tileID,a=i._tiles[o].tileID,n=new t.Point(r.canonical.x,r.canonical.y)._rotate(i.transform.angle),s=new t.Point(a.canonical.x,a.canonical.y)._rotate(i.transform.angle);return r.overscaledZ-a.overscaledZ||s.y-n.y||s.x-n.x})):o.sort(Dt)},i.prototype.hasRenderableParent=function(t){var e=this.findLoadedParent(t,0);return !!e&&this._isIdRenderable(e.tileID.key)},i.prototype._isIdRenderable=function(t,e){return this._tiles[t]&&this._tiles[t].hasData()&&!this._coveredTiles[t]&&(e||!this._tiles[t].holdingForFade())},i.prototype.reload=function(){if(this._paused)this._shouldReloadOnResume=!0;else for(var t in this._cache.reset(),this._tiles)"errored"!==this._tiles[t].state&&this._reloadTile(t,"reloading");},i.prototype._reloadTile=function(t,e){var i=this._tiles[t];i&&("loading"!==i.state&&(i.state=e),this._loadTile(i,this._tileLoaded.bind(this,i,t,e)));},i.prototype._tileLoaded=function(e,i,o,r){if(r)return e.state="errored",void(404!==r.status?this._source.fire(new t.ErrorEvent(r,{tile:e})):this.update(this.transform));e.timeAdded=t.browser.now(),"expired"===o&&(e.refreshedUponExpiration=!0),this._setTileReloadTimer(i,e),"raster-dem"===this.getSource().type&&e.dem&&this._backfillDEM(e),this._state.initializeTileState(e,this.map?this.map.painter:null),this._source.fire(new t.Event("data",{dataType:"source",tile:e,coord:e.tileID}));},i.prototype._backfillDEM=function(t){for(var e=this.getRenderableIds(),i=0;i<e.length;i++){var o=e[i];if(t.neighboringTiles&&t.neighboringTiles[o]){var r=this.getTileByID(o);a(t,r),a(r,t);}}function a(t,e){t.needsHillshadePrepare=!0;var i=e.tileID.canonical.x-t.tileID.canonical.x,o=e.tileID.canonical.y-t.tileID.canonical.y,r=Math.pow(2,t.tileID.canonical.z),a=e.tileID.key;0===i&&0===o||Math.abs(o)>1||(Math.abs(i)>1&&(1===Math.abs(i+r)?i+=r:1===Math.abs(i-r)&&(i-=r)),e.dem&&t.dem&&(t.dem.backfillBorder(e.dem,i,o),t.neighboringTiles&&t.neighboringTiles[a]&&(t.neighboringTiles[a].backfilled=!0)));}},i.prototype.getTile=function(t){return this.getTileByID(t.key)},i.prototype.getTileByID=function(t){return this._tiles[t]},i.prototype.getZoom=function(t){return t.zoom+t.scaleZoom(t.tileSize/this._source.tileSize)},i.prototype._retainLoadedChildren=function(t,e,i,o){for(var r in this._tiles){var a=this._tiles[r];if(!(o[r]||!a.hasData()||a.tileID.overscaledZ<=e||a.tileID.overscaledZ>i)){for(var n=a.tileID;a&&a.tileID.overscaledZ>e+1;){var s=a.tileID.scaledTo(a.tileID.overscaledZ-1);(a=this._tiles[s.key])&&a.hasData()&&(n=s);}for(var l=n;l.overscaledZ>e;)if(t[(l=l.scaledTo(l.overscaledZ-1)).key]){o[n.key]=n;break}}}},i.prototype.findLoadedParent=function(t,e){for(var i=t.overscaledZ-1;i>=e;i--){var o=t.scaledTo(i);if(!o)return;var r=String(o.key),a=this._tiles[r];if(a&&a.hasData())return a;if(this._cache.has(o))return this._cache.get(o)}},i.prototype.updateCacheSize=function(t){var e=(Math.ceil(t.width/this._source.tileSize)+1)*(Math.ceil(t.height/this._source.tileSize)+1),i=Math.floor(5*e),o="number"==typeof this._maxTileCacheSize?Math.min(this._maxTileCacheSize,i):i;this._cache.setMaxSize(o);},i.prototype.handleWrapJump=function(t){var e=(t-(void 0===this._prevLng?t:this._prevLng))/360,i=Math.round(e);if(this._prevLng=t,i){var o={};for(var r in this._tiles){var a=this._tiles[r];a.tileID=a.tileID.unwrapTo(a.tileID.wrap+i),o[a.tileID.key]=a;}for(var n in this._tiles=o,this._timers)clearTimeout(this._timers[n]),delete this._timers[n];for(var s in this._tiles){var l=this._tiles[s];this._setTileReloadTimer(s,l);}}},i.prototype.update=function(e){var o=this;if(this.transform=e,this._sourceLoaded&&!this._paused){var r;this.updateCacheSize(e),this.handleWrapJump(this.transform.center.lng),this._coveredTiles={},this.used?this._source.tileID?r=e.getVisibleUnwrappedCoordinates(this._source.tileID).map((function(e){return new t.OverscaledTileID(e.canonical.z,e.wrap,e.canonical.z,e.canonical.x,e.canonical.y)})):(r=e.coveringTiles({tileSize:this._source.tileSize,minzoom:this._source.minzoom,maxzoom:this._source.maxzoom,roundZoom:this._source.roundZoom,reparseOverscaled:this._source.reparseOverscaled}),this._source.hasTile&&(r=r.filter((function(t){return o._source.hasTile(t)})))):r=[];var a=(this._source.roundZoom?Math.round:Math.floor)(this.getZoom(e)),n=Math.max(a-i.maxOverzooming,this._source.minzoom),s=Math.max(a+i.maxUnderzooming,this._source.minzoom),l=this._updateRetainedTiles(r,a);if(Mt(this._source.type)){for(var c={},u={},h=0,p=Object.keys(l);h<p.length;h+=1){var d=p[h],_=l[d],f=this._tiles[d];if(f&&!(f.fadeEndTime&&f.fadeEndTime<=t.browser.now())){var m=this.findLoadedParent(_,n);m&&(this._addTile(m.tileID),c[m.tileID.key]=m.tileID),u[d]=_;}}for(var g in this._retainLoadedChildren(u,a,s,l),c)l[g]||(this._coveredTiles[g]=!0,l[g]=c[g]);}for(var v in l)this._tiles[v].clearFadeHold();for(var y=0,x=t.keysDifference(this._tiles,l);y<x.length;y+=1){var b=x[y],w=this._tiles[b];w.hasSymbolBuckets&&!w.holdingForFade()?w.setHoldDuration(this.map._fadeDuration):w.hasSymbolBuckets&&!w.symbolFadeFinished()||this._removeTile(b);}}},i.prototype.releaseSymbolFadeTiles=function(){for(var t in this._tiles)this._tiles[t].holdingForFade()&&this._removeTile(t);},i.prototype._updateRetainedTiles=function(t,e){for(var o={},r={},a=Math.max(e-i.maxOverzooming,this._source.minzoom),n=Math.max(e+i.maxUnderzooming,this._source.minzoom),s={},l=0,c=t;l<c.length;l+=1){var u=c[l],h=this._addTile(u);o[u.key]=u,h.hasData()||e<this._source.maxzoom&&(s[u.key]=u);}this._retainLoadedChildren(s,e,n,o);for(var p=0,d=t;p<d.length;p+=1){var _=d[p],f=this._tiles[_.key];if(!f.hasData()){if(e+1>this._source.maxzoom){var m=_.children(this._source.maxzoom)[0],g=this.getTile(m);if(g&&g.hasData()){o[m.key]=m;continue}}else{var v=_.children(this._source.maxzoom);if(o[v[0].key]&&o[v[1].key]&&o[v[2].key]&&o[v[3].key])continue}for(var y=f.wasRequested(),x=_.overscaledZ-1;x>=a;--x){var b=_.scaledTo(x);if(r[b.key])break;if(r[b.key]=!0,!(f=this.getTile(b))&&y&&(f=this._addTile(b)),f&&(o[b.key]=b,y=f.wasRequested(),f.hasData()))break}}}return o},i.prototype._addTile=function(e){var i=this._tiles[e.key];if(i)return i;(i=this._cache.getAndRemove(e))&&(this._setTileReloadTimer(e.key,i),i.tileID=e,this._state.initializeTileState(i,this.map?this.map.painter:null),this._cacheTimers[e.key]&&(clearTimeout(this._cacheTimers[e.key]),delete this._cacheTimers[e.key],this._setTileReloadTimer(e.key,i)));var o=Boolean(i);return o||(i=new t.Tile(e,this._source.tileSize*e.overscaleFactor()),this._loadTile(i,this._tileLoaded.bind(this,i,e.key,i.state))),i?(i.uses++,this._tiles[e.key]=i,o||this._source.fire(new t.Event("dataloading",{tile:i,coord:i.tileID,dataType:"source"})),i):null},i.prototype._setTileReloadTimer=function(t,e){var i=this;t in this._timers&&(clearTimeout(this._timers[t]),delete this._timers[t]);var o=e.getExpiryTimeout();o&&(this._timers[t]=setTimeout((function(){i._reloadTile(t,"expired"),delete i._timers[t];}),o));},i.prototype._removeTile=function(t){var e=this._tiles[t];e&&(e.uses--,delete this._tiles[t],this._timers[t]&&(clearTimeout(this._timers[t]),delete this._timers[t]),e.uses>0||(e.hasData()&&"reloading"!==e.state?this._cache.add(e.tileID,e,e.getExpiryTimeout()):(e.aborted=!0,this._abortTile(e),this._unloadTile(e))));},i.prototype.clearTiles=function(){for(var t in this._shouldReloadOnResume=!1,this._paused=!1,this._tiles)this._removeTile(t);this._cache.reset();},i.prototype.tilesIn=function(e,i,o){var r=this,a=[],n=this.transform;if(!n)return a;for(var s=o?n.getCameraQueryGeometry(e):e,l=e.map((function(t){return n.pointCoordinate(t)})),c=s.map((function(t){return n.pointCoordinate(t)})),u=this.getIds(),h=1/0,p=1/0,d=-1/0,_=-1/0,f=0,m=c;f<m.length;f+=1){var g=m[f];h=Math.min(h,g.x),p=Math.min(p,g.y),d=Math.max(d,g.x),_=Math.max(_,g.y);}for(var v=function(e){var o=r._tiles[u[e]];if(!o.holdingForFade()){var s=o.tileID,f=Math.pow(2,n.zoom-o.tileID.overscaledZ),m=i*o.queryPadding*t.EXTENT/o.tileSize/f,g=[s.getTilePoint(new t.MercatorCoordinate(h,p)),s.getTilePoint(new t.MercatorCoordinate(d,_))];if(g[0].x-m<t.EXTENT&&g[0].y-m<t.EXTENT&&g[1].x+m>=0&&g[1].y+m>=0){var v=l.map((function(t){return s.getTilePoint(t)})),y=c.map((function(t){return s.getTilePoint(t)}));a.push({tile:o,tileID:s,queryGeometry:v,cameraQueryGeometry:y,scale:f});}}},y=0;y<u.length;y++)v(y);return a},i.prototype.getVisibleCoordinates=function(t){for(var e=this,i=this.getRenderableIds(t).map((function(t){return e._tiles[t].tileID})),o=0,r=i;o<r.length;o+=1){var a=r[o];a.posMatrix=this.transform.calculatePosMatrix(a.toUnwrapped());}return i},i.prototype.hasTransition=function(){if(this._source.hasTransition())return !0;if(Mt(this._source.type))for(var e in this._tiles){var i=this._tiles[e];if(void 0!==i.fadeEndTime&&i.fadeEndTime>=t.browser.now())return !0}return !1},i.prototype.setFeatureState=function(t,e,i){t=t||"_geojsonTileLayer",this._state.updateState(t,e,i);},i.prototype.removeFeatureState=function(t,e,i){t=t||"_geojsonTileLayer",this._state.removeFeatureState(t,e,i);},i.prototype.getFeatureState=function(t,e){return t=t||"_geojsonTileLayer",this._state.getState(t,e)},i}(t.Evented);function Dt(t,e){return t%32-e%32||e-t}function Mt(t){return "raster"===t||"image"===t||"video"===t}function Rt(){return new t.window.Worker(or.workerUrl)}Lt.maxOverzooming=10,Lt.maxUnderzooming=3;var At=function(){this.active={};};At.prototype.acquire=function(t){if(!this.workers)for(this.workers=[];this.workers.length<At.workerCount;)this.workers.push(new Rt);return this.active[t]=!0,this.workers.slice()},At.prototype.release=function(t){delete this.active[t],0===Object.keys(this.active).length&&(this.workers.forEach((function(t){t.terminate();})),this.workers=null);};var kt,Bt=Math.floor(t.browser.hardwareConcurrency/2);function Ot(e,i){var o={};for(var r in e)"ref"!==r&&(o[r]=e[r]);return t.refProperties.forEach((function(t){t in i&&(o[t]=i[t]);})),o}function Ft(t){t=t.slice();for(var e=Object.create(null),i=0;i<t.length;i++)e[t[i].id]=t[i];for(var o=0;o<t.length;o++)"ref"in t[o]&&(t[o]=Ot(t[o],e[t[o].ref]));return t}At.workerCount=Math.max(Math.min(Bt,6),1);var Ut={setStyle:"setStyle",addLayer:"addLayer",removeLayer:"removeLayer",setPaintProperty:"setPaintProperty",setLayoutProperty:"setLayoutProperty",setFilter:"setFilter",addSource:"addSource",removeSource:"removeSource",setGeoJSONSourceData:"setGeoJSONSourceData",setLayerZoomRange:"setLayerZoomRange",setLayerProperty:"setLayerProperty",setCenter:"setCenter",setZoom:"setZoom",setBearing:"setBearing",setPitch:"setPitch",setSprite:"setSprite",setGlyphs:"setGlyphs",setTransition:"setTransition",setLight:"setLight"};function Nt(t,e,i){i.push({command:Ut.addSource,args:[t,e[t]]});}function Zt(t,e,i){e.push({command:Ut.removeSource,args:[t]}),i[t]=!0;}function Vt(t,e,i,o){Zt(t,i,o),Nt(t,e,i);}function qt(e,i,o){var r;for(r in e[o])if(e[o].hasOwnProperty(r)&&"data"!==r&&!t.deepEqual(e[o][r],i[o][r]))return !1;for(r in i[o])if(i[o].hasOwnProperty(r)&&"data"!==r&&!t.deepEqual(e[o][r],i[o][r]))return !1;return !0}function jt(e,i,o,r,a,n){var s;for(s in i=i||{},e=e||{})e.hasOwnProperty(s)&&(t.deepEqual(e[s],i[s])||o.push({command:n,args:[r,s,i[s],a]}));for(s in i)i.hasOwnProperty(s)&&!e.hasOwnProperty(s)&&(t.deepEqual(e[s],i[s])||o.push({command:n,args:[r,s,i[s],a]}));}function Gt(t){return t.id}function Wt(t,e){return t[e.id]=e,t}function Xt(e,i){if(!e)return [{command:Ut.setStyle,args:[i]}];var o=[];try{if(!t.deepEqual(e.version,i.version))return [{command:Ut.setStyle,args:[i]}];t.deepEqual(e.center,i.center)||o.push({command:Ut.setCenter,args:[i.center]}),t.deepEqual(e.zoom,i.zoom)||o.push({command:Ut.setZoom,args:[i.zoom]}),t.deepEqual(e.bearing,i.bearing)||o.push({command:Ut.setBearing,args:[i.bearing]}),t.deepEqual(e.pitch,i.pitch)||o.push({command:Ut.setPitch,args:[i.pitch]}),t.deepEqual(e.sprite,i.sprite)||o.push({command:Ut.setSprite,args:[i.sprite]}),t.deepEqual(e.glyphs,i.glyphs)||o.push({command:Ut.setGlyphs,args:[i.glyphs]}),t.deepEqual(e.transition,i.transition)||o.push({command:Ut.setTransition,args:[i.transition]}),t.deepEqual(e.light,i.light)||o.push({command:Ut.setLight,args:[i.light]});var r={},a=[];!function(e,i,o,r){var a;for(a in i=i||{},e=e||{})e.hasOwnProperty(a)&&(i.hasOwnProperty(a)||Zt(a,o,r));for(a in i)i.hasOwnProperty(a)&&(e.hasOwnProperty(a)?t.deepEqual(e[a],i[a])||("geojson"===e[a].type&&"geojson"===i[a].type&&qt(e,i,a)?o.push({command:Ut.setGeoJSONSourceData,args:[a,i[a].data]}):Vt(a,i,o,r)):Nt(a,i,o));}(e.sources,i.sources,a,r);var n=[];e.layers&&e.layers.forEach((function(t){r[t.source]?o.push({command:Ut.removeLayer,args:[t.id]}):n.push(t);})),o=o.concat(a),function(e,i,o){i=i||[];var r,a,n,s,l,c,u,h=(e=e||[]).map(Gt),p=i.map(Gt),d=e.reduce(Wt,{}),_=i.reduce(Wt,{}),f=h.slice(),m=Object.create(null);for(r=0,a=0;r<h.length;r++)n=h[r],_.hasOwnProperty(n)?a++:(o.push({command:Ut.removeLayer,args:[n]}),f.splice(f.indexOf(n,a),1));for(r=0,a=0;r<p.length;r++)n=p[p.length-1-r],f[f.length-1-r]!==n&&(d.hasOwnProperty(n)?(o.push({command:Ut.removeLayer,args:[n]}),f.splice(f.lastIndexOf(n,f.length-a),1)):a++,c=f[f.length-r],o.push({command:Ut.addLayer,args:[_[n],c]}),f.splice(f.length-r,0,n),m[n]=!0);for(r=0;r<p.length;r++)if(s=d[n=p[r]],l=_[n],!m[n]&&!t.deepEqual(s,l))if(t.deepEqual(s.source,l.source)&&t.deepEqual(s["source-layer"],l["source-layer"])&&t.deepEqual(s.type,l.type)){for(u in jt(s.layout,l.layout,o,n,null,Ut.setLayoutProperty),jt(s.paint,l.paint,o,n,null,Ut.setPaintProperty),t.deepEqual(s.filter,l.filter)||o.push({command:Ut.setFilter,args:[n,l.filter]}),t.deepEqual(s.minzoom,l.minzoom)&&t.deepEqual(s.maxzoom,l.maxzoom)||o.push({command:Ut.setLayerZoomRange,args:[n,l.minzoom,l.maxzoom]}),s)s.hasOwnProperty(u)&&"layout"!==u&&"paint"!==u&&"filter"!==u&&"metadata"!==u&&"minzoom"!==u&&"maxzoom"!==u&&(0===u.indexOf("paint.")?jt(s[u],l[u],o,n,u.slice(6),Ut.setPaintProperty):t.deepEqual(s[u],l[u])||o.push({command:Ut.setLayerProperty,args:[n,u,l[u]]}));for(u in l)l.hasOwnProperty(u)&&!s.hasOwnProperty(u)&&"layout"!==u&&"paint"!==u&&"filter"!==u&&"metadata"!==u&&"minzoom"!==u&&"maxzoom"!==u&&(0===u.indexOf("paint.")?jt(s[u],l[u],o,n,u.slice(6),Ut.setPaintProperty):t.deepEqual(s[u],l[u])||o.push({command:Ut.setLayerProperty,args:[n,u,l[u]]}));}else o.push({command:Ut.removeLayer,args:[n]}),c=f[f.lastIndexOf(n)+1],o.push({command:Ut.addLayer,args:[l,c]});}(n,i.layers,o);}catch(t){console.warn("Unable to compute style diff:",t),o=[{command:Ut.setStyle,args:[i]}];}return o}var Ht=function(t,e,i){var o=this.boxCells=[],r=this.circleCells=[];this.xCellCount=Math.ceil(t/i),this.yCellCount=Math.ceil(e/i);for(var a=0;a<this.xCellCount*this.yCellCount;a++)o.push([]),r.push([]);this.circleKeys=[],this.boxKeys=[],this.bboxes=[],this.circles=[],this.width=t,this.height=e,this.xScale=this.xCellCount/t,this.yScale=this.yCellCount/e,this.boxUid=0,this.circleUid=0;};function Kt(e,i,o,r,a){var n=t.create();return i?(t.scale(n,n,[1/a,1/a,1]),o||t.rotateZ(n,n,r.angle)):t.multiply(n,r.labelPlaneMatrix,e),n}function Jt(e,i,o,r,a){if(i){var n=t.clone(e);return t.scale(n,n,[a,a,1]),o||t.rotateZ(n,n,-r.angle),n}return r.glCoordMatrix}function Yt(e,i){var o=[e.x,e.y,0,1];se(o,o,i);var r=o[3];return {point:new t.Point(o[0]/r,o[1]/r),signedDistanceFromCamera:r}}function Qt(t,e){var i=t[0]/t[3],o=t[1]/t[3];return i>=-e[0]&&i<=e[0]&&o>=-e[1]&&o<=e[1]}function $t(e,i,o,r,a,n,s,l){var c=r?e.textSizeData:e.iconSizeData,u=t.evaluateSizeForZoom(c,o.transform.zoom),h=[256/o.width*2+1,256/o.height*2+1],p=r?e.text.dynamicLayoutVertexArray:e.icon.dynamicLayoutVertexArray;p.clear();for(var d=e.lineVertexArray,_=r?e.text.placedSymbolArray:e.icon.placedSymbolArray,f=o.transform.width/o.transform.height,m=!1,g=0;g<_.length;g++){var v=_.get(g);if(v.hidden||v.writingMode===t.WritingMode.vertical&&!m)ne(v.numGlyphs,p);else{m=!1;var y=[v.anchorX,v.anchorY,0,1];if(t.transformMat4(y,y,i),Qt(y,h)){var x=.5+y[3]/o.transform.cameraToCenterDistance*.5,b=t.evaluateSizeForFeature(c,u,v),w=s?b*x:b/x,E=new t.Point(v.anchorX,v.anchorY),T=Yt(E,a).point,I={},C=ie(v,w,!1,l,i,a,n,e.glyphOffsetArray,d,p,T,E,I,f);m=C.useVertical,(C.notEnoughRoom||m||C.needsFlipping&&ie(v,w,!0,l,i,a,n,e.glyphOffsetArray,d,p,T,E,I,f).notEnoughRoom)&&ne(v.numGlyphs,p);}else ne(v.numGlyphs,p);}}r?e.text.dynamicLayoutVertexBuffer.updateData(p):e.icon.dynamicLayoutVertexBuffer.updateData(p);}function te(t,e,i,o,r,a,n,s,l,c,u,h){var p=s.glyphStartIndex+s.numGlyphs,d=s.lineStartIndex,_=s.lineStartIndex+s.lineLength,f=e.getoffsetX(s.glyphStartIndex),m=e.getoffsetX(p-1),g=re(t*f,i,o,r,a,n,s.segment,d,_,l,c,u,h);if(!g)return null;var v=re(t*m,i,o,r,a,n,s.segment,d,_,l,c,u,h);return v?{first:g,last:v}:null}function ee(e,i,o,r){if(e===t.WritingMode.horizontal&&Math.abs(o.y-i.y)>Math.abs(o.x-i.x)*r)return {useVertical:!0};return (e===t.WritingMode.vertical?i.y<o.y:i.x>o.x)?{needsFlipping:!0}:null}function ie(e,i,o,r,a,n,s,l,c,u,h,p,d,_){var f,m=i/24,g=e.lineOffsetX*m,v=e.lineOffsetY*m;if(e.numGlyphs>1){var y=e.glyphStartIndex+e.numGlyphs,x=e.lineStartIndex,b=e.lineStartIndex+e.lineLength,w=te(m,l,g,v,o,h,p,e,c,n,d,!1);if(!w)return {notEnoughRoom:!0};var E=Yt(w.first.point,s).point,T=Yt(w.last.point,s).point;if(r&&!o){var I=ee(e.writingMode,E,T,_);if(I)return I}f=[w.first];for(var C=e.glyphStartIndex+1;C<y-1;C++)f.push(re(m*l.getoffsetX(C),g,v,o,h,p,e.segment,x,b,c,n,d,!1));f.push(w.last);}else{if(r&&!o){var S=Yt(p,a).point,P=e.lineStartIndex+e.segment+1,z=new t.Point(c.getx(P),c.gety(P)),L=Yt(z,a),D=L.signedDistanceFromCamera>0?L.point:oe(p,z,S,1,a),M=ee(e.writingMode,S,D,_);if(M)return M}var R=re(m*l.getoffsetX(e.glyphStartIndex),g,v,o,h,p,e.segment,e.lineStartIndex,e.lineStartIndex+e.lineLength,c,n,d,!1);if(!R)return {notEnoughRoom:!0};f=[R];}for(var A=0,k=f;A<k.length;A+=1){var B=k[A];t.addDynamicAttributes(u,B.point,B.angle);}return {}}function oe(t,e,i,o,r){var a=Yt(t.add(t.sub(e)._unit()),r).point,n=i.sub(a);return i.add(n._mult(o/n.mag()))}function re(e,i,o,r,a,n,s,l,c,u,h,p,d){var _=r?e-i:e+i,f=_>0?1:-1,m=0;r&&(f*=-1,m=Math.PI),f<0&&(m+=Math.PI);for(var g=f>0?l+s:l+s+1,v=g,y=a,x=a,b=0,w=0,E=Math.abs(_);b+w<=E;){if((g+=f)<l||g>=c)return null;if(x=y,void 0===(y=p[g])){var T=new t.Point(u.getx(g),u.gety(g)),I=Yt(T,h);if(I.signedDistanceFromCamera>0)y=p[g]=I.point;else{var C=g-f;y=oe(0===b?n:new t.Point(u.getx(C),u.gety(C)),T,x,E-b+1,h);}}b+=w,w=x.dist(y);}var S=(E-b)/w,P=y.sub(x),z=P.mult(S)._add(x);return z._add(P._unit()._perp()._mult(o*f)),{point:z,angle:m+Math.atan2(y.y-x.y,y.x-x.x),tileDistance:d?{prevTileDistance:g-f===v?0:u.gettileUnitDistanceFromAnchor(g-f),lastSegmentViewportDistance:E-b}:null}}Ht.prototype.keysLength=function(){return this.boxKeys.length+this.circleKeys.length},Ht.prototype.insert=function(t,e,i,o,r){this._forEachCell(e,i,o,r,this._insertBoxCell,this.boxUid++),this.boxKeys.push(t),this.bboxes.push(e),this.bboxes.push(i),this.bboxes.push(o),this.bboxes.push(r);},Ht.prototype.insertCircle=function(t,e,i,o){this._forEachCell(e-o,i-o,e+o,i+o,this._insertCircleCell,this.circleUid++),this.circleKeys.push(t),this.circles.push(e),this.circles.push(i),this.circles.push(o);},Ht.prototype._insertBoxCell=function(t,e,i,o,r,a){this.boxCells[r].push(a);},Ht.prototype._insertCircleCell=function(t,e,i,o,r,a){this.circleCells[r].push(a);},Ht.prototype._query=function(t,e,i,o,r,a){if(i<0||t>this.width||o<0||e>this.height)return !r&&[];var n=[];if(t<=0&&e<=0&&this.width<=i&&this.height<=o){if(r)return !0;for(var s=0;s<this.boxKeys.length;s++)n.push({key:this.boxKeys[s],x1:this.bboxes[4*s],y1:this.bboxes[4*s+1],x2:this.bboxes[4*s+2],y2:this.bboxes[4*s+3]});for(var l=0;l<this.circleKeys.length;l++){var c=this.circles[3*l],u=this.circles[3*l+1],h=this.circles[3*l+2];n.push({key:this.circleKeys[l],x1:c-h,y1:u-h,x2:c+h,y2:u+h});}return a?n.filter(a):n}var p={hitTest:r,seenUids:{box:{},circle:{}}};return this._forEachCell(t,e,i,o,this._queryCell,n,p,a),r?n.length>0:n},Ht.prototype._queryCircle=function(t,e,i,o,r){var a=t-i,n=t+i,s=e-i,l=e+i;if(n<0||a>this.width||l<0||s>this.height)return !o&&[];var c=[],u={hitTest:o,circle:{x:t,y:e,radius:i},seenUids:{box:{},circle:{}}};return this._forEachCell(a,s,n,l,this._queryCellCircle,c,u,r),o?c.length>0:c},Ht.prototype.query=function(t,e,i,o,r){return this._query(t,e,i,o,!1,r)},Ht.prototype.hitTest=function(t,e,i,o,r){return this._query(t,e,i,o,!0,r)},Ht.prototype.hitTestCircle=function(t,e,i,o){return this._queryCircle(t,e,i,!0,o)},Ht.prototype._queryCell=function(t,e,i,o,r,a,n,s){var l=n.seenUids,c=this.boxCells[r];if(null!==c)for(var u=this.bboxes,h=0,p=c;h<p.length;h+=1){var d=p[h];if(!l.box[d]){l.box[d]=!0;var _=4*d;if(t<=u[_+2]&&e<=u[_+3]&&i>=u[_+0]&&o>=u[_+1]&&(!s||s(this.boxKeys[d]))){if(n.hitTest)return a.push(!0),!0;a.push({key:this.boxKeys[d],x1:u[_],y1:u[_+1],x2:u[_+2],y2:u[_+3]});}}}var f=this.circleCells[r];if(null!==f)for(var m=this.circles,g=0,v=f;g<v.length;g+=1){var y=v[g];if(!l.circle[y]){l.circle[y]=!0;var x=3*y;if(this._circleAndRectCollide(m[x],m[x+1],m[x+2],t,e,i,o)&&(!s||s(this.circleKeys[y]))){if(n.hitTest)return a.push(!0),!0;var b=m[x],w=m[x+1],E=m[x+2];a.push({key:this.circleKeys[y],x1:b-E,y1:w-E,x2:b+E,y2:w+E});}}}},Ht.prototype._queryCellCircle=function(t,e,i,o,r,a,n,s){var l=n.circle,c=n.seenUids,u=this.boxCells[r];if(null!==u)for(var h=this.bboxes,p=0,d=u;p<d.length;p+=1){var _=d[p];if(!c.box[_]){c.box[_]=!0;var f=4*_;if(this._circleAndRectCollide(l.x,l.y,l.radius,h[f+0],h[f+1],h[f+2],h[f+3])&&(!s||s(this.boxKeys[_])))return a.push(!0),!0}}var m=this.circleCells[r];if(null!==m)for(var g=this.circles,v=0,y=m;v<y.length;v+=1){var x=y[v];if(!c.circle[x]){c.circle[x]=!0;var b=3*x;if(this._circlesCollide(g[b],g[b+1],g[b+2],l.x,l.y,l.radius)&&(!s||s(this.circleKeys[x])))return a.push(!0),!0}}},Ht.prototype._forEachCell=function(t,e,i,o,r,a,n,s){for(var l=this._convertToXCellCoord(t),c=this._convertToYCellCoord(e),u=this._convertToXCellCoord(i),h=this._convertToYCellCoord(o),p=l;p<=u;p++)for(var d=c;d<=h;d++){var _=this.xCellCount*d+p;if(r.call(this,t,e,i,o,_,a,n,s))return}},Ht.prototype._convertToXCellCoord=function(t){return Math.max(0,Math.min(this.xCellCount-1,Math.floor(t*this.xScale)))},Ht.prototype._convertToYCellCoord=function(t){return Math.max(0,Math.min(this.yCellCount-1,Math.floor(t*this.yScale)))},Ht.prototype._circlesCollide=function(t,e,i,o,r,a){var n=o-t,s=r-e,l=i+a;return l*l>n*n+s*s},Ht.prototype._circleAndRectCollide=function(t,e,i,o,r,a,n){var s=(a-o)/2,l=Math.abs(t-(o+s));if(l>s+i)return !1;var c=(n-r)/2,u=Math.abs(e-(r+c));if(u>c+i)return !1;if(l<=s||u<=c)return !0;var h=l-s,p=u-c;return h*h+p*p<=i*i};var ae=new Float32Array([-1/0,-1/0,0,-1/0,-1/0,0,-1/0,-1/0,0,-1/0,-1/0,0]);function ne(t,e){for(var i=0;i<t;i++){var o=e.length;e.resize(o+4),e.float32.set(ae,3*o);}}function se(t,e,i){var o=e[0],r=e[1];return t[0]=i[0]*o+i[4]*r+i[12],t[1]=i[1]*o+i[5]*r+i[13],t[3]=i[3]*o+i[7]*r+i[15],t}var le=function(t,e,i){void 0===e&&(e=new Ht(t.width+200,t.height+200,25)),void 0===i&&(i=new Ht(t.width+200,t.height+200,25)),this.transform=t,this.grid=e,this.ignoredGrid=i,this.pitchfactor=Math.cos(t._pitch)*t.cameraToCenterDistance,this.screenRightBoundary=t.width+100,this.screenBottomBoundary=t.height+100,this.gridRightBoundary=t.width+200,this.gridBottomBoundary=t.height+200;};function ce(t,e,i){t[e+4]=i?1:0;}function ue(e,i,o){return i*(t.EXTENT/(e.tileSize*Math.pow(2,o-e.tileID.overscaledZ)))}le.prototype.placeCollisionBox=function(t,e,i,o,r){var a=this.projectAndGetPerspectiveRatio(o,t.anchorPointX,t.anchorPointY),n=i*a.perspectiveRatio,s=t.x1*n+a.point.x,l=t.y1*n+a.point.y,c=t.x2*n+a.point.x,u=t.y2*n+a.point.y;return !this.isInsideGrid(s,l,c,u)||!e&&this.grid.hitTest(s,l,c,u,r)?{box:[],offscreen:!1}:{box:[s,l,c,u],offscreen:this.isOffscreen(s,l,c,u)}},le.prototype.approximateTileDistance=function(t,e,i,o,r){var a=r?1:o/this.pitchfactor,n=t.lastSegmentViewportDistance*i;return t.prevTileDistance+n+(a-1)*n*Math.abs(Math.sin(e))},le.prototype.placeCollisionCircles=function(e,i,o,r,a,n,s,l,c,u,h,p,d){var _=[],f=this.projectAnchor(c,a.anchorX,a.anchorY),m=l/24,g=a.lineOffsetX*l,v=a.lineOffsetY*l,y=new t.Point(a.anchorX,a.anchorY),x=te(m,s,g,v,!1,Yt(y,u).point,y,a,n,u,{},!0),b=!1,w=!1,E=!0,T=f.perspectiveRatio*r,I=1/(r*o),C=0,S=0;x&&(C=this.approximateTileDistance(x.first.tileDistance,x.first.angle,I,f.cameraDistance,p),S=this.approximateTileDistance(x.last.tileDistance,x.last.angle,I,f.cameraDistance,p));for(var P=0;P<e.length;P+=5){var z=e[P],L=e[P+1],D=e[P+2],M=e[P+3];if(!x||M<-C||M>S)ce(e,P,!1);else{var R=this.projectPoint(c,z,L),A=D*T;if(_.length>0){var k=R.x-_[_.length-4],B=R.y-_[_.length-3];if(A*A*2>k*k+B*B)if(P+8<e.length){var O=e[P+8];if(O>-C&&O<S){ce(e,P,!1);continue}}}var F=P/5;_.push(R.x,R.y,A,F),ce(e,P,!0);var U=R.x-A,N=R.y-A,Z=R.x+A,V=R.y+A;if(E=E&&this.isOffscreen(U,N,Z,V),w=w||this.isInsideGrid(U,N,Z,V),!i&&this.grid.hitTestCircle(R.x,R.y,A,d)){if(!h)return {circles:[],offscreen:!1};b=!0;}}}return {circles:b||!w?[]:_,offscreen:E}},le.prototype.queryRenderedSymbols=function(e){if(0===e.length||0===this.grid.keysLength()&&0===this.ignoredGrid.keysLength())return {};for(var i=[],o=1/0,r=1/0,a=-1/0,n=-1/0,s=0,l=e;s<l.length;s+=1){var c=l[s],u=new t.Point(c.x+100,c.y+100);o=Math.min(o,u.x),r=Math.min(r,u.y),a=Math.max(a,u.x),n=Math.max(n,u.y),i.push(u);}for(var h={},p={},d=0,_=this.grid.query(o,r,a,n).concat(this.ignoredGrid.query(o,r,a,n));d<_.length;d+=1){var f=_[d],m=f.key;if(void 0===h[m.bucketInstanceId]&&(h[m.bucketInstanceId]={}),!h[m.bucketInstanceId][m.featureIndex]){var g=[new t.Point(f.x1,f.y1),new t.Point(f.x2,f.y1),new t.Point(f.x2,f.y2),new t.Point(f.x1,f.y2)];t.polygonIntersectsPolygon(i,g)&&(h[m.bucketInstanceId][m.featureIndex]=!0,void 0===p[m.bucketInstanceId]&&(p[m.bucketInstanceId]=[]),p[m.bucketInstanceId].push(m.featureIndex));}}return p},le.prototype.insertCollisionBox=function(t,e,i,o,r){var a={bucketInstanceId:i,featureIndex:o,collisionGroupID:r};(e?this.ignoredGrid:this.grid).insert(a,t[0],t[1],t[2],t[3]);},le.prototype.insertCollisionCircles=function(t,e,i,o,r){for(var a=e?this.ignoredGrid:this.grid,n={bucketInstanceId:i,featureIndex:o,collisionGroupID:r},s=0;s<t.length;s+=4)a.insertCircle(n,t[s],t[s+1],t[s+2]);},le.prototype.projectAnchor=function(t,e,i){var o=[e,i,0,1];return se(o,o,t),{perspectiveRatio:.5+this.transform.cameraToCenterDistance/o[3]*.5,cameraDistance:o[3]}},le.prototype.projectPoint=function(e,i,o){var r=[i,o,0,1];return se(r,r,e),new t.Point((r[0]/r[3]+1)/2*this.transform.width+100,(-r[1]/r[3]+1)/2*this.transform.height+100)},le.prototype.projectAndGetPerspectiveRatio=function(e,i,o){var r=[i,o,0,1];return se(r,r,e),{point:new t.Point((r[0]/r[3]+1)/2*this.transform.width+100,(-r[1]/r[3]+1)/2*this.transform.height+100),perspectiveRatio:.5+this.transform.cameraToCenterDistance/r[3]*.5}},le.prototype.isOffscreen=function(t,e,i,o){return i<100||t>=this.screenRightBoundary||o<100||e>this.screenBottomBoundary},le.prototype.isInsideGrid=function(t,e,i,o){return i>=0&&t<this.gridRightBoundary&&o>=0&&e<this.gridBottomBoundary};var he=function(t,e,i,o){this.opacity=t?Math.max(0,Math.min(1,t.opacity+(t.placed?e:-e))):o&&i?1:0,this.placed=i;};he.prototype.isHidden=function(){return 0===this.opacity&&!this.placed};var pe=function(t,e,i,o,r){this.text=new he(t?t.text:null,e,i,r),this.icon=new he(t?t.icon:null,e,o,r);};pe.prototype.isHidden=function(){return this.text.isHidden()&&this.icon.isHidden()};var de=function(t,e,i){this.text=t,this.icon=e,this.skipFade=i;},_e=function(t,e,i,o,r){this.bucketInstanceId=t,this.featureIndex=e,this.sourceLayerIndex=i,this.bucketIndex=o,this.tileID=r;},fe=function(t){this.crossSourceCollisions=t,this.maxGroupID=0,this.collisionGroups={};};function me(e,i,o,r,a){var n=t.getAnchorAlignment(e),s=-(n.horizontalAlign-.5)*i,l=-(n.verticalAlign-.5)*o,c=t.evaluateVariableOffset(e,r);return new t.Point(s+c[0]*a,l+c[1]*a)}function ge(e,i,o,r,a,n){var s=e.x1,l=e.x2,c=e.y1,u=e.y2,h=e.anchorPointX,p=e.anchorPointY,d=new t.Point(i,o);return r&&d._rotate(a?n:-n),{x1:s+d.x,y1:c+d.y,x2:l+d.x,y2:u+d.y,anchorPointX:h,anchorPointY:p}}fe.prototype.get=function(t){if(this.crossSourceCollisions)return {ID:0,predicate:null};if(!this.collisionGroups[t]){var e=++this.maxGroupID;this.collisionGroups[t]={ID:e,predicate:function(t){return t.collisionGroupID===e}};}return this.collisionGroups[t]};var ve=function(t,e,i,o){this.transform=t.clone(),this.collisionIndex=new le(this.transform),this.placements={},this.opacities={},this.variableOffsets={},this.stale=!1,this.commitTime=0,this.fadeDuration=e,this.retainedQueryData={},this.collisionGroups=new fe(i),this.prevPlacement=o,o&&(o.prevPlacement=void 0),this.placedOrientations={};};function ye(t,e,i,o,r){t.emplaceBack(e?1:0,i?1:0,o||0,r||0),t.emplaceBack(e?1:0,i?1:0,o||0,r||0),t.emplaceBack(e?1:0,i?1:0,o||0,r||0),t.emplaceBack(e?1:0,i?1:0,o||0,r||0);}ve.prototype.placeLayerTile=function(e,i,o,r){var a=i.getBucket(e),n=i.latestFeatureIndex;if(a&&n&&e.id===a.layerIds[0]){var s=i.collisionBoxArray,l=a.layers[0].layout,c=Math.pow(2,this.transform.zoom-i.tileID.overscaledZ),u=i.tileSize/t.EXTENT,h=this.transform.calculatePosMatrix(i.tileID.toUnwrapped()),p=Kt(h,"map"===l.get("text-pitch-alignment"),"map"===l.get("text-rotation-alignment"),this.transform,ue(i,1,this.transform.zoom)),d=Kt(h,"map"===l.get("icon-pitch-alignment"),"map"===l.get("icon-rotation-alignment"),this.transform,ue(i,1,this.transform.zoom));this.retainedQueryData[a.bucketInstanceId]=new _e(a.bucketInstanceId,n,a.sourceLayerIndex,a.index,i.tileID),this.placeLayerBucket(a,h,p,d,c,u,o,i.holdingForFade(),r,s);}},ve.prototype.attemptAnchorPlacement=function(t,e,i,o,r,a,n,s,l,c,u,h,p,d){var _,f=[h.textOffset0,h.textOffset1],m=me(t,i,o,f,r),g=this.collisionIndex.placeCollisionBox(ge(e,m.x,m.y,a,n,this.transform.angle),u,s,l,c.predicate);if(g.box.length>0)return this.prevPlacement&&this.prevPlacement.variableOffsets[h.crossTileID]&&this.prevPlacement.placements[h.crossTileID]&&this.prevPlacement.placements[h.crossTileID].text&&(_=this.prevPlacement.variableOffsets[h.crossTileID].anchor),this.variableOffsets[h.crossTileID]={textOffset:f,width:i,height:o,anchor:t,textBoxScale:r,prevAnchor:_},this.markUsedJustification(p,t,h,d),p.allowVerticalPlacement&&(this.markUsedOrientation(p,d,h),this.placedOrientations[h.crossTileID]=d),{shift:m,placedGlyphBoxes:g}},ve.prototype.placeLayerBucket=function(e,i,o,r,a,n,s,l,c,u){var h=this,p=e.layers[0].layout,d=t.evaluateSizeForZoom(e.textSizeData,this.transform.zoom),_=p.get("text-optional"),f=p.get("icon-optional"),m=p.get("text-allow-overlap"),g=p.get("icon-allow-overlap"),v=m&&(g||!e.hasIconData()||f),y=g&&(m||!e.hasTextData()||_),x=this.collisionGroups.get(e.sourceID),b="map"===p.get("text-rotation-alignment"),w="map"===p.get("text-pitch-alignment"),E="none"!==p.get("icon-text-fit"),T="viewport-y"===p.get("symbol-z-order");!e.collisionArrays&&u&&e.deserializeCollisionBoxes(u);var I=function(r,u){if(!c[r.crossTileID])if(l)h.placements[r.crossTileID]=new de(!1,!1,!1);else{var g,T=!1,I=!1,C=!0,S=null,P={box:null,offscreen:null},z={box:null,offscreen:null},L=null,D=null,M=0,R=0,A=0;u.textFeatureIndex&&(M=u.textFeatureIndex),u.verticalTextFeatureIndex&&(R=u.verticalTextFeatureIndex);var k=u.textBox;if(k){var B=function(i){var o=t.WritingMode.horizontal;if(e.allowVerticalPlacement&&!i&&h.prevPlacement){var a=h.prevPlacement.placedOrientations[r.crossTileID];a&&(h.placedOrientations[r.crossTileID]=a,o=a,h.markUsedOrientation(e,o,r));}return o},O=function(i,o){if(e.allowVerticalPlacement&&r.numVerticalGlyphVertices>0&&u.verticalTextBox)for(var a=0,n=e.writingModes;a<n.length;a+=1){if(n[a]===t.WritingMode.vertical?(P=o(),z=P):P=i(),P&&P.box&&P.box.length)break}else P=i();};if(p.get("text-variable-anchor")){var F=p.get("text-variable-anchor");if(h.prevPlacement&&h.prevPlacement.variableOffsets[r.crossTileID]){var U=h.prevPlacement.variableOffsets[r.crossTileID];F.indexOf(U.anchor)>0&&(F=F.filter((function(t){return t!==U.anchor}))).unshift(U.anchor);}var N=function(t,o){for(var a=t.x2-t.x1,s=t.y2-t.y1,l=r.textBoxScale,c={box:[],offscreen:!1},u=m?2*F.length:F.length,p=0;p<u;++p){var d=F[p%F.length],_=p>=F.length,f=h.attemptAnchorPlacement(d,t,a,s,l,b,w,n,i,x,_,r,e,o);if(f&&(c=f.placedGlyphBoxes)&&c.box&&c.box.length){T=!0,S=f.shift;break}}return c};O((function(){return N(k,t.WritingMode.horizontal)}),(function(){var i=u.verticalTextBox,o=P&&P.box&&P.box.length;return e.allowVerticalPlacement&&!o&&r.numVerticalGlyphVertices>0&&i?N(i,t.WritingMode.vertical):{box:null,offscreen:null}})),P&&(T=P.box,C=P.offscreen);var Z=B(P&&P.box);if(!T&&h.prevPlacement){var V=h.prevPlacement.variableOffsets[r.crossTileID];V&&(h.variableOffsets[r.crossTileID]=V,h.markUsedJustification(e,V.anchor,r,Z));}}else{var q=function(t,o){var a=h.collisionIndex.placeCollisionBox(t,p.get("text-allow-overlap"),n,i,x.predicate);return a&&a.box&&a.box.length&&(h.markUsedOrientation(e,o,r),h.placedOrientations[r.crossTileID]=o),a};O((function(){return q(k,t.WritingMode.horizontal)}),(function(){var i=u.verticalTextBox;return e.allowVerticalPlacement&&r.numVerticalGlyphVertices>0&&i?q(i,t.WritingMode.vertical):{box:null,offscreen:null}})),B(P&&P.box&&P.box.length);}}T=(g=P)&&g.box&&g.box.length>0,C=g&&g.offscreen;var j=u.textCircles;if(j){var G=e.text.placedSymbolArray.get(r.centerJustifiedTextSymbolIndex),W=t.evaluateSizeForFeature(e.textSizeData,d,G);L=h.collisionIndex.placeCollisionCircles(j,p.get("text-allow-overlap"),a,n,G,e.lineVertexArray,e.glyphOffsetArray,W,i,o,s,w,x.predicate),T=p.get("text-allow-overlap")||L.circles.length>0,C=C&&L.offscreen;}if(u.iconFeatureIndex&&(A=u.iconFeatureIndex),u.iconBox){var X=E&&S?ge(u.iconBox,S.x,S.y,b,w,h.transform.angle):u.iconBox;I=(D=h.collisionIndex.placeCollisionBox(X,p.get("icon-allow-overlap"),n,i,x.predicate)).box.length>0,C=C&&D.offscreen;}var H=_||0===r.numHorizontalGlyphVertices&&0===r.numVerticalGlyphVertices,K=f||0===r.numIconVertices;H||K?K?H||(I=I&&T):T=I&&T:I=T=I&&T,T&&g&&g.box&&(z&&z.box&&R?h.collisionIndex.insertCollisionBox(g.box,p.get("text-ignore-placement"),e.bucketInstanceId,R,x.ID):h.collisionIndex.insertCollisionBox(g.box,p.get("text-ignore-placement"),e.bucketInstanceId,M,x.ID)),I&&D&&h.collisionIndex.insertCollisionBox(D.box,p.get("icon-ignore-placement"),e.bucketInstanceId,A,x.ID),T&&L&&h.collisionIndex.insertCollisionCircles(L.circles,p.get("text-ignore-placement"),e.bucketInstanceId,M,x.ID),h.placements[r.crossTileID]=new de(T||v,I||y,C||e.justReloaded),c[r.crossTileID]=!0;}};if(T)for(var C=e.getSortedSymbolIndexes(this.transform.angle),S=C.length-1;S>=0;--S){var P=C[S];I(e.symbolInstances.get(P),e.collisionArrays[P]);}else for(var z=0;z<e.symbolInstances.length;++z)I(e.symbolInstances.get(z),e.collisionArrays[z]);e.justReloaded=!1;},ve.prototype.markUsedJustification=function(e,i,o,r){var a,n={left:o.leftJustifiedTextSymbolIndex,center:o.centerJustifiedTextSymbolIndex,right:o.rightJustifiedTextSymbolIndex};a=r===t.WritingMode.vertical?o.verticalPlacedTextSymbolIndex:n[t.getAnchorJustification(i)];for(var s=0,l=[o.leftJustifiedTextSymbolIndex,o.centerJustifiedTextSymbolIndex,o.rightJustifiedTextSymbolIndex,o.verticalPlacedTextSymbolIndex];s<l.length;s+=1){var c=l[s];c>=0&&(e.text.placedSymbolArray.get(c).crossTileID=a>=0&&c!==a?0:o.crossTileID);}},ve.prototype.markUsedOrientation=function(e,i,o){for(var r=i===t.WritingMode.horizontal||i===t.WritingMode.horizontalOnly?i:0,a=i===t.WritingMode.vertical?i:0,n=0,s=[o.leftJustifiedTextSymbolIndex,o.centerJustifiedTextSymbolIndex,o.rightJustifiedTextSymbolIndex];n<s.length;n+=1){var l=s[n];e.text.placedSymbolArray.get(l).placedOrientation=r;}o.verticalPlacedTextSymbolIndex&&(e.text.placedSymbolArray.get(o.verticalPlacedTextSymbolIndex).placedOrientation=a);},ve.prototype.commit=function(t){this.commitTime=t;var e=this.prevPlacement,i=!1,o=e&&0!==this.fadeDuration?(this.commitTime-e.commitTime)/this.fadeDuration:1,r=e?e.opacities:{},a=e?e.variableOffsets:{},n=e?e.placedOrientations:{};for(var s in this.placements){var l=this.placements[s],c=r[s];c?(this.opacities[s]=new pe(c,o,l.text,l.icon),i=i||l.text!==c.text.placed||l.icon!==c.icon.placed):(this.opacities[s]=new pe(null,o,l.text,l.icon,l.skipFade),i=i||l.text||l.icon);}for(var u in r){var h=r[u];if(!this.opacities[u]){var p=new pe(h,o,!1,!1);p.isHidden()||(this.opacities[u]=p,i=i||h.text.placed||h.icon.placed);}}for(var d in a)this.variableOffsets[d]||!this.opacities[d]||this.opacities[d].isHidden()||(this.variableOffsets[d]=a[d]);for(var _ in n)this.placedOrientations[_]||!this.opacities[_]||this.opacities[_].isHidden()||(this.placedOrientations[_]=n[_]);i?this.lastPlacementChangeTime=t:"number"!=typeof this.lastPlacementChangeTime&&(this.lastPlacementChangeTime=e?e.lastPlacementChangeTime:t);},ve.prototype.updateLayerOpacities=function(t,e){for(var i={},o=0,r=e;o<r.length;o+=1){var a=r[o],n=a.getBucket(t);n&&a.latestFeatureIndex&&t.id===n.layerIds[0]&&this.updateBucketOpacities(n,i,a.collisionBoxArray);}},ve.prototype.updateBucketOpacities=function(e,i,o){e.hasTextData()&&e.text.opacityVertexArray.clear(),e.hasIconData()&&e.icon.opacityVertexArray.clear(),e.hasIconCollisionBoxData()&&e.iconCollisionBox.collisionVertexArray.clear(),e.hasTextCollisionBoxData()&&e.textCollisionBox.collisionVertexArray.clear(),e.hasIconCollisionCircleData()&&e.iconCollisionCircle.collisionVertexArray.clear(),e.hasTextCollisionCircleData()&&e.textCollisionCircle.collisionVertexArray.clear();var r=e.layers[0].layout,a=new pe(null,0,!1,!1,!0),n=r.get("text-allow-overlap"),s=r.get("icon-allow-overlap"),l=r.get("text-variable-anchor"),c="map"===r.get("text-rotation-alignment"),u="map"===r.get("text-pitch-alignment"),h="none"!==r.get("icon-text-fit"),p=new pe(null,0,n&&(s||!e.hasIconData()||r.get("icon-optional")),s&&(n||!e.hasTextData()||r.get("text-optional")),!0);!e.collisionArrays&&o&&(e.hasIconCollisionBoxData()||e.hasIconCollisionCircleData()||e.hasTextCollisionBoxData()||e.hasTextCollisionCircleData())&&e.deserializeCollisionBoxes(o);for(var d=0;d<e.symbolInstances.length;d++){var _=e.symbolInstances.get(d),f=_.numHorizontalGlyphVertices,m=_.numVerticalGlyphVertices,g=_.crossTileID,v=i[g],y=this.opacities[g];v?y=a:y||(y=p,this.opacities[g]=y),i[g]=!0;var x=f>0||m>0,b=_.numIconVertices>0;if(x){for(var w=Se(y.text),E=(f+m)/4,T=0;T<E;T++)e.text.opacityVertexArray.emplaceBack(w);var I=y.text.isHidden()?1:0,C=this.placedOrientations[_.crossTileID],S=C===t.WritingMode.horizontal||C===t.WritingMode.horizontalOnly?1:0,P=C===t.WritingMode.vertical?1:0;[_.rightJustifiedTextSymbolIndex,_.centerJustifiedTextSymbolIndex,_.leftJustifiedTextSymbolIndex].forEach((function(t){t>=0&&(e.text.placedSymbolArray.get(t).hidden=I||P);})),_.verticalPlacedTextSymbolIndex>=0&&(e.text.placedSymbolArray.get(_.verticalPlacedTextSymbolIndex).hidden=I||S);var z=this.variableOffsets[_.crossTileID];z&&this.markUsedJustification(e,z.anchor,_,C);var L=this.placedOrientations[_.crossTileID];L&&(this.markUsedJustification(e,"left",_,L),this.markUsedOrientation(e,L,_));}if(b){for(var D=Se(y.icon),M=0;M<_.numIconVertices/4;M++)e.icon.opacityVertexArray.emplaceBack(D);e.icon.placedSymbolArray.get(d).hidden=y.icon.isHidden();}if(e.hasIconCollisionBoxData()||e.hasIconCollisionCircleData()||e.hasTextCollisionBoxData()||e.hasTextCollisionCircleData()){var R=e.collisionArrays[d];if(R){var A=new t.Point(0,0);if(R.textBox){var k=!0;if(l){var B=this.variableOffsets[g];B?(A=me(B.anchor,B.width,B.height,B.textOffset,B.textBoxScale),c&&A._rotate(u?this.transform.angle:-this.transform.angle)):k=!1;}ye(e.textCollisionBox.collisionVertexArray,y.text.placed,!k,A.x,A.y);}R.iconBox&&ye(e.iconCollisionBox.collisionVertexArray,y.icon.placed,!1,h?A.x:0,h?A.y:0);var O=R.textCircles;if(O&&e.hasTextCollisionCircleData())for(var F=0;F<O.length;F+=5){var U=v||0===O[F+4];ye(e.textCollisionCircle.collisionVertexArray,y.text.placed,U);}}}}e.sortFeatures(this.transform.angle),this.retainedQueryData[e.bucketInstanceId]&&(this.retainedQueryData[e.bucketInstanceId].featureSortOrder=e.featureSortOrder),e.hasTextData()&&e.text.opacityVertexBuffer&&e.text.opacityVertexBuffer.updateData(e.text.opacityVertexArray),e.hasIconData()&&e.icon.opacityVertexBuffer&&e.icon.opacityVertexBuffer.updateData(e.icon.opacityVertexArray),e.hasIconCollisionBoxData()&&e.iconCollisionBox.collisionVertexBuffer&&e.iconCollisionBox.collisionVertexBuffer.updateData(e.iconCollisionBox.collisionVertexArray),e.hasTextCollisionBoxData()&&e.textCollisionBox.collisionVertexBuffer&&e.textCollisionBox.collisionVertexBuffer.updateData(e.textCollisionBox.collisionVertexArray),e.hasIconCollisionCircleData()&&e.iconCollisionCircle.collisionVertexBuffer&&e.iconCollisionCircle.collisionVertexBuffer.updateData(e.iconCollisionCircle.collisionVertexArray),e.hasTextCollisionCircleData()&&e.textCollisionCircle.collisionVertexBuffer&&e.textCollisionCircle.collisionVertexBuffer.updateData(e.textCollisionCircle.collisionVertexArray);},ve.prototype.symbolFadeChange=function(t){return 0===this.fadeDuration?1:(t-this.commitTime)/this.fadeDuration},ve.prototype.hasTransitions=function(t){return this.stale||t-this.lastPlacementChangeTime<this.fadeDuration},ve.prototype.stillRecent=function(t){return this.commitTime+this.fadeDuration>t},ve.prototype.setStale=function(){this.stale=!0;};var xe=Math.pow(2,25),be=Math.pow(2,24),we=Math.pow(2,17),Ee=Math.pow(2,16),Te=Math.pow(2,9),Ie=Math.pow(2,8),Ce=Math.pow(2,1);function Se(t){if(0===t.opacity&&!t.placed)return 0;if(1===t.opacity&&t.placed)return 4294967295;var e=t.placed?1:0,i=Math.floor(127*t.opacity);return i*xe+e*be+i*we+e*Ee+i*Te+e*Ie+i*Ce+e}var Pe=function(){this._currentTileIndex=0,this._seenCrossTileIDs={};};Pe.prototype.continuePlacement=function(t,e,i,o,r){for(;this._currentTileIndex<t.length;){var a=t[this._currentTileIndex];if(e.placeLayerTile(o,a,i,this._seenCrossTileIDs),this._currentTileIndex++,r())return !0}};var ze=function(t,e,i,o,r,a,n){this.placement=new ve(t,r,a,n),this._currentPlacementIndex=e.length-1,this._forceFullPlacement=i,this._showCollisionBoxes=o,this._done=!1;};ze.prototype.isDone=function(){return this._done},ze.prototype.continuePlacement=function(e,i,o){for(var r=this,a=t.browser.now(),n=function(){var e=t.browser.now()-a;return !r._forceFullPlacement&&e>2};this._currentPlacementIndex>=0;){var s=i[e[this._currentPlacementIndex]],l=this.placement.collisionIndex.transform.zoom;if("symbol"===s.type&&(!s.minzoom||s.minzoom<=l)&&(!s.maxzoom||s.maxzoom>l)){if(this._inProgressLayer||(this._inProgressLayer=new Pe),this._inProgressLayer.continuePlacement(o[s.source],this.placement,this._showCollisionBoxes,s,n))return;delete this._inProgressLayer;}this._currentPlacementIndex--;}this._done=!0;},ze.prototype.commit=function(t){return this.placement.commit(t),this.placement};var Le=512/t.EXTENT/2,De=function(t,e,i){this.tileID=t,this.indexedSymbolInstances={},this.bucketInstanceId=i;for(var o=0;o<e.length;o++){var r=e.get(o),a=r.key;this.indexedSymbolInstances[a]||(this.indexedSymbolInstances[a]=[]),this.indexedSymbolInstances[a].push({crossTileID:r.crossTileID,coord:this.getScaledCoordinates(r,t)});}};De.prototype.getScaledCoordinates=function(e,i){var o=i.canonical.z-this.tileID.canonical.z,r=Le/Math.pow(2,o);return {x:Math.floor((i.canonical.x*t.EXTENT+e.anchorX)*r),y:Math.floor((i.canonical.y*t.EXTENT+e.anchorY)*r)}},De.prototype.findMatches=function(t,e,i){for(var o=this.tileID.canonical.z<e.canonical.z?1:Math.pow(2,this.tileID.canonical.z-e.canonical.z),r=0;r<t.length;r++){var a=t.get(r);if(!a.crossTileID){var n=this.indexedSymbolInstances[a.key];if(n)for(var s=this.getScaledCoordinates(a,e),l=0,c=n;l<c.length;l+=1){var u=c[l];if(Math.abs(u.coord.x-s.x)<=o&&Math.abs(u.coord.y-s.y)<=o&&!i[u.crossTileID]){i[u.crossTileID]=!0,a.crossTileID=u.crossTileID;break}}}}};var Me=function(){this.maxCrossTileID=0;};Me.prototype.generate=function(){return ++this.maxCrossTileID};var Re=function(){this.indexes={},this.usedCrossTileIDs={},this.lng=0;};Re.prototype.handleWrapJump=function(t){var e=Math.round((t-this.lng)/360);if(0!==e)for(var i in this.indexes){var o=this.indexes[i],r={};for(var a in o){var n=o[a];n.tileID=n.tileID.unwrapTo(n.tileID.wrap+e),r[n.tileID.key]=n;}this.indexes[i]=r;}this.lng=t;},Re.prototype.addBucket=function(t,e,i){if(this.indexes[t.overscaledZ]&&this.indexes[t.overscaledZ][t.key]){if(this.indexes[t.overscaledZ][t.key].bucketInstanceId===e.bucketInstanceId)return !1;this.removeBucketCrossTileIDs(t.overscaledZ,this.indexes[t.overscaledZ][t.key]);}for(var o=0;o<e.symbolInstances.length;o++){e.symbolInstances.get(o).crossTileID=0;}this.usedCrossTileIDs[t.overscaledZ]||(this.usedCrossTileIDs[t.overscaledZ]={});var r=this.usedCrossTileIDs[t.overscaledZ];for(var a in this.indexes){var n=this.indexes[a];if(Number(a)>t.overscaledZ)for(var s in n){var l=n[s];l.tileID.isChildOf(t)&&l.findMatches(e.symbolInstances,t,r);}else{var c=n[t.scaledTo(Number(a)).key];c&&c.findMatches(e.symbolInstances,t,r);}}for(var u=0;u<e.symbolInstances.length;u++){var h=e.symbolInstances.get(u);h.crossTileID||(h.crossTileID=i.generate(),r[h.crossTileID]=!0);}return void 0===this.indexes[t.overscaledZ]&&(this.indexes[t.overscaledZ]={}),this.indexes[t.overscaledZ][t.key]=new De(t,e.symbolInstances,e.bucketInstanceId),!0},Re.prototype.removeBucketCrossTileIDs=function(t,e){for(var i in e.indexedSymbolInstances)for(var o=0,r=e.indexedSymbolInstances[i];o<r.length;o+=1){var a=r[o];delete this.usedCrossTileIDs[t][a.crossTileID];}},Re.prototype.removeStaleBuckets=function(t){var e=!1;for(var i in this.indexes){var o=this.indexes[i];for(var r in o)t[o[r].bucketInstanceId]||(this.removeBucketCrossTileIDs(i,o[r]),delete o[r],e=!0);}return e};var Ae=function(){this.layerIndexes={},this.crossTileIDs=new Me,this.maxBucketInstanceId=0,this.bucketsInCurrentPlacement={};};Ae.prototype.addLayer=function(t,e,i){var o=this.layerIndexes[t.id];void 0===o&&(o=this.layerIndexes[t.id]=new Re);var r=!1,a={};o.handleWrapJump(i);for(var n=0,s=e;n<s.length;n+=1){var l=s[n],c=l.getBucket(t);c&&t.id===c.layerIds[0]&&(c.bucketInstanceId||(c.bucketInstanceId=++this.maxBucketInstanceId),o.addBucket(l.tileID,c,this.crossTileIDs)&&(r=!0),a[c.bucketInstanceId]=!0);}return o.removeStaleBuckets(a)&&(r=!0),r},Ae.prototype.pruneUnusedLayers=function(t){var e={};for(var i in t.forEach((function(t){e[t]=!0;})),this.layerIndexes)e[i]||delete this.layerIndexes[i];};var ke=function(e,i){return t.emitValidationErrors(e,i&&i.filter((function(t){return "source.canvas"!==t.identifier})))},Be=t.pick(Ut,["addLayer","removeLayer","setPaintProperty","setLayoutProperty","setFilter","addSource","removeSource","setLayerZoomRange","setLight","setTransition","setGeoJSONSourceData"]),Oe=t.pick(Ut,["setCenter","setZoom","setBearing","setPitch"]),Fe=function(e){function i(o,r){var a=this;void 0===r&&(r={}),e.call(this),this.map=o,this.dispatcher=new T((kt||(kt=new At),kt),this),this.imageManager=new p,this.imageManager.setEventedParent(this),this.glyphManager=new y(o._requestManager,r.localIdeographFontFamily),this.lineAtlas=new E(256,512),this.crossTileSymbolIndex=new Ae,this._layers={},this._order=[],this.sourceCaches={},this.zoomHistory=new t.ZoomHistory,this._loaded=!1,this._resetUpdates(),this.dispatcher.broadcast("setReferrer",t.getReferrer());var n=this;this._rtlTextPluginCallback=i.registerForPluginAvailability((function(t){for(var e in n.dispatcher.broadcast("loadRTLTextPlugin",t.pluginURL,t.completionCallback),n.sourceCaches)n.sourceCaches[e].reload();})),this.on("data",(function(t){if("source"===t.dataType&&"metadata"===t.sourceDataType){var e=a.sourceCaches[t.sourceId];if(e){var i=e.getSource();if(i&&i.vectorLayerIds)for(var o in a._layers){var r=a._layers[o];r.source===i.id&&a._validateLayer(r);}}}}));}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.loadURL=function(e,i){var o=this;void 0===i&&(i={}),this.fire(new t.Event("dataloading",{dataType:"style"}));var r="boolean"==typeof i.validate?i.validate:!t.isMapboxURL(e);e=this.map._requestManager.normalizeStyleURL(e,i.accessToken);var a=this.map._requestManager.transformRequest(e,t.ResourceType.Style);this._request=t.getJSON(a,(function(e,i){o._request=null,e?o.fire(new t.ErrorEvent(e)):i&&o._load(i,r);}));},i.prototype.loadJSON=function(e,i){var o=this;void 0===i&&(i={}),this.fire(new t.Event("dataloading",{dataType:"style"})),this._request=t.browser.frame((function(){o._request=null,o._load(e,!1!==i.validate);}));},i.prototype._load=function(e,i){var o=this;if(!i||!ke(this,t.validateStyle(e))){for(var r in this._loaded=!0,this.stylesheet=e,e.sources)this.addSource(r,e.sources[r],{validate:!1});e.sprite?this._spriteRequest=function(e,i,o){var r,a,n,s=t.browser.devicePixelRatio>1?"@2x":"",l=t.getJSON(i.transformRequest(i.normalizeSpriteURL(e,s,".json"),t.ResourceType.SpriteJSON),(function(t,e){l=null,n||(n=t,r=e,u());})),c=t.getImage(i.transformRequest(i.normalizeSpriteURL(e,s,".png"),t.ResourceType.SpriteImage),(function(t,e){c=null,n||(n=t,a=e,u());}));function u(){if(n)o(n);else if(r&&a){var e=t.browser.getImageData(a),i={};for(var s in r){var l=r[s],c=l.width,u=l.height,h=l.x,p=l.y,d=l.sdf,_=l.pixelRatio,f=new t.RGBAImage({width:c,height:u});t.RGBAImage.copy(e,f,{x:h,y:p},{x:0,y:0},{width:c,height:u}),i[s]={data:f,pixelRatio:_,sdf:d};}o(null,i);}}return {cancel:function(){l&&(l.cancel(),l=null),c&&(c.cancel(),c=null);}}}(e.sprite,this.map._requestManager,(function(e,i){if(o._spriteRequest=null,e)o.fire(new t.ErrorEvent(e));else if(i)for(var r in i)o.imageManager.addImage(r,i[r]);o.imageManager.setLoaded(!0),o.dispatcher.broadcast("setImages",o.imageManager.listImages()),o.fire(new t.Event("data",{dataType:"style"}));})):this.imageManager.setLoaded(!0),this.glyphManager.setURL(e.glyphs);var a=Ft(this.stylesheet.layers);this._order=a.map((function(t){return t.id})),this._layers={};for(var n=0,s=a;n<s.length;n+=1){var l=s[n];(l=t.createStyleLayer(l)).setEventedParent(this,{layer:{id:l.id}}),this._layers[l.id]=l;}this.dispatcher.broadcast("setLayers",this._serializeLayers(this._order)),this.light=new w(this.stylesheet.light),this.fire(new t.Event("data",{dataType:"style"})),this.fire(new t.Event("style.load"));}},i.prototype._validateLayer=function(e){var i=this.sourceCaches[e.source];if(i){var o=e.sourceLayer;if(o){var r=i.getSource();("geojson"===r.type||r.vectorLayerIds&&-1===r.vectorLayerIds.indexOf(o))&&this.fire(new t.ErrorEvent(new Error('Source layer "'+o+'" does not exist on source "'+r.id+'" as specified by style layer "'+e.id+'"')));}}},i.prototype.loaded=function(){if(!this._loaded)return !1;if(Object.keys(this._updatedSources).length)return !1;for(var t in this.sourceCaches)if(!this.sourceCaches[t].loaded())return !1;return !!this.imageManager.isLoaded()},i.prototype._serializeLayers=function(t){for(var e=[],i=0,o=t;i<o.length;i+=1){var r=o[i],a=this._layers[r];"custom"!==a.type&&e.push(a.serialize());}return e},i.prototype.hasTransitions=function(){if(this.light&&this.light.hasTransition())return !0;for(var t in this.sourceCaches)if(this.sourceCaches[t].hasTransition())return !0;for(var e in this._layers)if(this._layers[e].hasTransition())return !0;return !1},i.prototype._checkLoaded=function(){if(!this._loaded)throw new Error("Style is not done loading")},i.prototype.update=function(e){if(this._loaded){var i=this._changed;if(this._changed){var o=Object.keys(this._updatedLayers),r=Object.keys(this._removedLayers);for(var a in(o.length||r.length)&&this._updateWorkerLayers(o,r),this._updatedSources){var n=this._updatedSources[a];"reload"===n?this._reloadSource(a):"clear"===n&&this._clearSource(a);}for(var s in this._updatedPaintProps)this._layers[s].updateTransitions(e);this.light.updateTransitions(e),this._resetUpdates();}for(var l in this.sourceCaches)this.sourceCaches[l].used=!1;for(var c=0,u=this._order;c<u.length;c+=1){var h=u[c],p=this._layers[h];p.recalculate(e,this.imageManager.listImages()),!p.isHidden(e.zoom)&&p.source&&(this.sourceCaches[p.source].used=!0);}this.light.recalculate(e),this.z=e.zoom,i&&this.fire(new t.Event("data",{dataType:"style"}));}},i.prototype._updateWorkerLayers=function(t,e){this.dispatcher.broadcast("updateLayers",{layers:this._serializeLayers(t),removedIds:e});},i.prototype._resetUpdates=function(){this._changed=!1,this._updatedLayers={},this._removedLayers={},this._updatedSources={},this._updatedPaintProps={};},i.prototype.setState=function(e){var i=this;if(this._checkLoaded(),ke(this,t.validateStyle(e)))return !1;(e=t.clone$1(e)).layers=Ft(e.layers);var o=Xt(this.serialize(),e).filter((function(t){return !(t.command in Oe)}));if(0===o.length)return !1;var r=o.filter((function(t){return !(t.command in Be)}));if(r.length>0)throw new Error("Unimplemented: "+r.map((function(t){return t.command})).join(", ")+".");return o.forEach((function(t){"setTransition"!==t.command&&i[t.command].apply(i,t.args);})),this.stylesheet=e,!0},i.prototype.addImage=function(e,i){if(this.getImage(e))return this.fire(new t.ErrorEvent(new Error("An image with this name already exists.")));this.imageManager.addImage(e,i),this.fire(new t.Event("data",{dataType:"style"}));},i.prototype.updateImage=function(t,e){this.imageManager.updateImage(t,e);},i.prototype.getImage=function(t){return this.imageManager.getImage(t)},i.prototype.removeImage=function(e){if(!this.getImage(e))return this.fire(new t.ErrorEvent(new Error("No image with this name exists.")));this.imageManager.removeImage(e),this.fire(new t.Event("data",{dataType:"style"}));},i.prototype.listImages=function(){return this._checkLoaded(),this.imageManager.listImages()},i.prototype.addSource=function(e,i,o){var r=this;if(void 0===o&&(o={}),this._checkLoaded(),void 0!==this.sourceCaches[e])throw new Error("There is already a source with this ID");if(!i.type)throw new Error("The type property must be defined, but the only the following properties were given: "+Object.keys(i).join(", ")+".");if(!(["vector","raster","geojson","video","image"].indexOf(i.type)>=0)||!this._validate(t.validateStyle.source,"sources."+e,i,null,o)){this.map&&this.map._collectResourceTiming&&(i.collectResourceTiming=!0);var a=this.sourceCaches[e]=new Lt(e,i,this.dispatcher);a.style=this,a.setEventedParent(this,(function(){return {isSourceLoaded:r.loaded(),source:a.serialize(),sourceId:e}})),a.onAdd(this.map),this._changed=!0;}},i.prototype.removeSource=function(e){if(this._checkLoaded(),void 0===this.sourceCaches[e])throw new Error("There is no source with this ID");for(var i in this._layers)if(this._layers[i].source===e)return this.fire(new t.ErrorEvent(new Error('Source "'+e+'" cannot be removed while layer "'+i+'" is using it.')));var o=this.sourceCaches[e];delete this.sourceCaches[e],delete this._updatedSources[e],o.fire(new t.Event("data",{sourceDataType:"metadata",dataType:"source",sourceId:e})),o.setEventedParent(null),o.clearTiles(),o.onRemove&&o.onRemove(this.map),this._changed=!0;},i.prototype.setGeoJSONSourceData=function(t,e){this._checkLoaded(),this.sourceCaches[t].getSource().setData(e),this._changed=!0;},i.prototype.getSource=function(t){return this.sourceCaches[t]&&this.sourceCaches[t].getSource()},i.prototype.addLayer=function(e,i,o){void 0===o&&(o={}),this._checkLoaded();var r=e.id;if(this.getLayer(r))this.fire(new t.ErrorEvent(new Error('Layer with id "'+r+'" already exists on this map')));else{var a;if("custom"===e.type){if(ke(this,t.validateCustomStyleLayer(e)))return;a=t.createStyleLayer(e);}else{if("object"==typeof e.source&&(this.addSource(r,e.source),e=t.clone$1(e),e=t.extend(e,{source:r})),this._validate(t.validateStyle.layer,"layers."+r,e,{arrayIndex:-1},o))return;a=t.createStyleLayer(e),this._validateLayer(a),a.setEventedParent(this,{layer:{id:r}});}var n=i?this._order.indexOf(i):this._order.length;if(i&&-1===n)this.fire(new t.ErrorEvent(new Error('Layer with id "'+i+'" does not exist on this map.')));else{if(this._order.splice(n,0,r),this._layerOrderChanged=!0,this._layers[r]=a,this._removedLayers[r]&&a.source&&"custom"!==a.type){var s=this._removedLayers[r];delete this._removedLayers[r],s.type!==a.type?this._updatedSources[a.source]="clear":(this._updatedSources[a.source]="reload",this.sourceCaches[a.source].pause());}this._updateLayer(a),a.onAdd&&a.onAdd(this.map);}}},i.prototype.moveLayer=function(e,i){if(this._checkLoaded(),this._changed=!0,this._layers[e]){if(e!==i){var o=this._order.indexOf(e);this._order.splice(o,1);var r=i?this._order.indexOf(i):this._order.length;i&&-1===r?this.fire(new t.ErrorEvent(new Error('Layer with id "'+i+'" does not exist on this map.'))):(this._order.splice(r,0,e),this._layerOrderChanged=!0);}}else this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot be moved.")));},i.prototype.removeLayer=function(e){this._checkLoaded();var i=this._layers[e];if(i){i.setEventedParent(null);var o=this._order.indexOf(e);this._order.splice(o,1),this._layerOrderChanged=!0,this._changed=!0,this._removedLayers[e]=i,delete this._layers[e],delete this._updatedLayers[e],delete this._updatedPaintProps[e],i.onRemove&&i.onRemove(this.map);}else this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot be removed.")));},i.prototype.getLayer=function(t){return this._layers[t]},i.prototype.setLayerZoomRange=function(e,i,o){this._checkLoaded();var r=this.getLayer(e);r?r.minzoom===i&&r.maxzoom===o||(null!=i&&(r.minzoom=i),null!=o&&(r.maxzoom=o),this._updateLayer(r)):this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot have zoom extent.")));},i.prototype.setFilter=function(e,i,o){void 0===o&&(o={}),this._checkLoaded();var r=this.getLayer(e);if(r){if(!t.deepEqual(r.filter,i))return null==i?(r.filter=void 0,void this._updateLayer(r)):void(this._validate(t.validateStyle.filter,"layers."+r.id+".filter",i,null,o)||(r.filter=t.clone$1(i),this._updateLayer(r)))}else this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot be filtered.")));},i.prototype.getFilter=function(e){return t.clone$1(this.getLayer(e).filter)},i.prototype.setLayoutProperty=function(e,i,o,r){void 0===r&&(r={}),this._checkLoaded();var a=this.getLayer(e);a?t.deepEqual(a.getLayoutProperty(i),o)||(a.setLayoutProperty(i,o,r),this._updateLayer(a)):this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot be styled.")));},i.prototype.getLayoutProperty=function(e,i){var o=this.getLayer(e);if(o)return o.getLayoutProperty(i);this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style.")));},i.prototype.setPaintProperty=function(e,i,o,r){void 0===r&&(r={}),this._checkLoaded();var a=this.getLayer(e);a?t.deepEqual(a.getPaintProperty(i),o)||(a.setPaintProperty(i,o,r)&&this._updateLayer(a),this._changed=!0,this._updatedPaintProps[e]=!0):this.fire(new t.ErrorEvent(new Error("The layer '"+e+"' does not exist in the map's style and cannot be styled.")));},i.prototype.getPaintProperty=function(t,e){return this.getLayer(t).getPaintProperty(e)},i.prototype.setFeatureState=function(e,i){this._checkLoaded();var o=e.source,r=e.sourceLayer,a=this.sourceCaches[o],n=parseInt(e.id,10);if(void 0!==a){var s=a.getSource().type;"geojson"===s&&r?this.fire(new t.ErrorEvent(new Error("GeoJSON sources cannot have a sourceLayer parameter."))):"vector"!==s||r?isNaN(n)||n<0?this.fire(new t.ErrorEvent(new Error("The feature id parameter must be provided and non-negative."))):a.setFeatureState(r,n,i):this.fire(new t.ErrorEvent(new Error("The sourceLayer parameter must be provided for vector source types.")));}else this.fire(new t.ErrorEvent(new Error("The source '"+o+"' does not exist in the map's style.")));},i.prototype.removeFeatureState=function(e,i){this._checkLoaded();var o=e.source,r=this.sourceCaches[o];if(void 0!==r){var a=r.getSource().type,n="vector"===a?e.sourceLayer:void 0,s=parseInt(e.id,10);"vector"!==a||n?void 0!==e.id&&isNaN(s)||s<0?this.fire(new t.ErrorEvent(new Error("The feature id parameter must be non-negative."))):i&&"string"!=typeof e.id&&"number"!=typeof e.id?this.fire(new t.ErrorEvent(new Error("A feature id is requred to remove its specific state property."))):r.removeFeatureState(n,s,i):this.fire(new t.ErrorEvent(new Error("The sourceLayer parameter must be provided for vector source types.")));}else this.fire(new t.ErrorEvent(new Error("The source '"+o+"' does not exist in the map's style.")));},i.prototype.getFeatureState=function(e){this._checkLoaded();var i=e.source,o=e.sourceLayer,r=this.sourceCaches[i],a=parseInt(e.id,10);if(void 0!==r)if("vector"!==r.getSource().type||o){if(!(isNaN(a)||a<0))return r.getFeatureState(o,a);this.fire(new t.ErrorEvent(new Error("The feature id parameter must be provided and non-negative.")));}else this.fire(new t.ErrorEvent(new Error("The sourceLayer parameter must be provided for vector source types.")));else this.fire(new t.ErrorEvent(new Error("The source '"+i+"' does not exist in the map's style.")));},i.prototype.getTransition=function(){return t.extend({duration:300,delay:0},this.stylesheet&&this.stylesheet.transition)},i.prototype.serialize=function(){return t.filterObject({version:this.stylesheet.version,name:this.stylesheet.name,metadata:this.stylesheet.metadata,light:this.stylesheet.light,center:this.stylesheet.center,zoom:this.stylesheet.zoom,bearing:this.stylesheet.bearing,pitch:this.stylesheet.pitch,sprite:this.stylesheet.sprite,glyphs:this.stylesheet.glyphs,transition:this.stylesheet.transition,sources:t.mapObject(this.sourceCaches,(function(t){return t.serialize()})),layers:this._serializeLayers(this._order)},(function(t){return void 0!==t}))},i.prototype._updateLayer=function(t){this._updatedLayers[t.id]=!0,t.source&&!this._updatedSources[t.source]&&(this._updatedSources[t.source]="reload",this.sourceCaches[t.source].pause()),this._changed=!0;},i.prototype._flattenAndSortRenderedFeatures=function(t){for(var e=this,i=function(t){return "fill-extrusion"===e._layers[t].type},o={},r=[],a=this._order.length-1;a>=0;a--){var n=this._order[a];if(i(n)){o[n]=a;for(var s=0,l=t;s<l.length;s+=1){var c=l[s][n];if(c)for(var u=0,h=c;u<h.length;u+=1){var p=h[u];r.push(p);}}}}r.sort((function(t,e){return e.intersectionZ-t.intersectionZ}));for(var d=[],_=this._order.length-1;_>=0;_--){var f=this._order[_];if(i(f))for(var m=r.length-1;m>=0;m--){var g=r[m].feature;if(o[g.layer.id]<_)break;d.push(g),r.pop();}else for(var v=0,y=t;v<y.length;v+=1){var x=y[v][f];if(x)for(var b=0,w=x;b<w.length;b+=1){var E=w[b];d.push(E.feature);}}}return d},i.prototype.queryRenderedFeatures=function(e,i,o){i&&i.filter&&this._validate(t.validateStyle.filter,"queryRenderedFeatures.filter",i.filter,null,i);var r={};if(i&&i.layers){if(!Array.isArray(i.layers))return this.fire(new t.ErrorEvent(new Error("parameters.layers must be an Array."))),[];for(var a=0,n=i.layers;a<n.length;a+=1){var s=n[a],l=this._layers[s];if(!l)return this.fire(new t.ErrorEvent(new Error("The layer '"+s+"' does not exist in the map's style and cannot be queried for features."))),[];r[l.source]=!0;}}var c=[];for(var u in this.sourceCaches)i.layers&&!r[u]||c.push(O(this.sourceCaches[u],this._layers,e,i,o));return this.placement&&c.push(function(t,e,i,o,r,a){for(var n={},s=r.queryRenderedSymbols(i),l=[],c=0,u=Object.keys(s).map(Number);c<u.length;c+=1){var h=u[c];l.push(a[h]);}l.sort(F);for(var p=function(){var e=_[d],i=e.featureIndex.lookupSymbolFeatures(s[e.bucketInstanceId],e.bucketIndex,e.sourceLayerIndex,o.filter,o.layers,t);for(var r in i){var a=n[r]=n[r]||[],l=i[r];l.sort((function(t,i){var o=e.featureSortOrder;if(o){var r=o.indexOf(t.featureIndex);return o.indexOf(i.featureIndex)-r}return i.featureIndex-t.featureIndex}));for(var c=0,u=l;c<u.length;c+=1){var h=u[c];a.push(h);}}},d=0,_=l;d<_.length;d+=1)p();var f=function(i){n[i].forEach((function(o){var r=o.feature,a=t[i],n=e[a.source].getFeatureState(r.layer["source-layer"],r.id);r.source=r.layer.source,r.layer["source-layer"]&&(r.sourceLayer=r.layer["source-layer"]),r.state=n;}));};for(var m in n)f(m);return n}(this._layers,this.sourceCaches,e,i,this.placement.collisionIndex,this.placement.retainedQueryData)),this._flattenAndSortRenderedFeatures(c)},i.prototype.querySourceFeatures=function(e,i){i&&i.filter&&this._validate(t.validateStyle.filter,"querySourceFeatures.filter",i.filter,null,i);var o=this.sourceCaches[e];return o?function(t,e){for(var i=t.getRenderableIds().map((function(e){return t.getTileByID(e)})),o=[],r={},a=0;a<i.length;a++){var n=i[a],s=n.tileID.canonical.key;r[s]||(r[s]=!0,n.querySourceFeatures(o,e));}return o}(o,i):[]},i.prototype.addSourceType=function(t,e,o){return i.getSourceType(t)?o(new Error('A source type called "'+t+'" already exists.')):(i.setSourceType(t,e),e.workerSourceURL?void this.dispatcher.broadcast("loadWorkerSource",{name:t,url:e.workerSourceURL},o):o(null,null))},i.prototype.getLight=function(){return this.light.getLight()},i.prototype.setLight=function(e,i){void 0===i&&(i={}),this._checkLoaded();var o=this.light.getLight(),r=!1;for(var a in e)if(!t.deepEqual(e[a],o[a])){r=!0;break}if(r){var n={now:t.browser.now(),transition:t.extend({duration:300,delay:0},this.stylesheet.transition)};this.light.setLight(e,i),this.light.updateTransitions(n);}},i.prototype._validate=function(e,i,o,r,a){return void 0===a&&(a={}),(!a||!1!==a.validate)&&ke(this,e.call(t.validateStyle,t.extend({key:i,style:this.serialize(),value:o,styleSpec:t.styleSpec},r)))},i.prototype._remove=function(){for(var e in this._request&&(this._request.cancel(),this._request=null),this._spriteRequest&&(this._spriteRequest.cancel(),this._spriteRequest=null),t.evented.off("pluginAvailable",this._rtlTextPluginCallback),this.sourceCaches)this.sourceCaches[e].clearTiles();this.dispatcher.remove();},i.prototype._clearSource=function(t){this.sourceCaches[t].clearTiles();},i.prototype._reloadSource=function(t){this.sourceCaches[t].resume(),this.sourceCaches[t].reload();},i.prototype._updateSources=function(t){for(var e in this.sourceCaches)this.sourceCaches[e].update(t);},i.prototype._generateCollisionBoxes=function(){for(var t in this.sourceCaches)this._reloadSource(t);},i.prototype._updatePlacement=function(e,i,o,r){for(var a=!1,n=!1,s={},l=0,c=this._order;l<c.length;l+=1){var u=c[l],h=this._layers[u];if("symbol"===h.type){if(!s[h.source]){var p=this.sourceCaches[h.source];s[h.source]=p.getRenderableIds(!0).map((function(t){return p.getTileByID(t)})).sort((function(t,e){return e.tileID.overscaledZ-t.tileID.overscaledZ||(t.tileID.isLessThan(e.tileID)?-1:1)}));}var d=this.crossTileSymbolIndex.addLayer(h,s[h.source],e.center.lng);a=a||d;}}this.crossTileSymbolIndex.pruneUnusedLayers(this._order);var _=this._layerOrderChanged||0===o;if((_||!this.pauseablePlacement||this.pauseablePlacement.isDone()&&!this.placement.stillRecent(t.browser.now()))&&(this.pauseablePlacement=new ze(e,this._order,_,i,o,r,this.placement),this._layerOrderChanged=!1),this.pauseablePlacement.isDone()?this.placement.setStale():(this.pauseablePlacement.continuePlacement(this._order,this._layers,s),this.pauseablePlacement.isDone()&&(this.placement=this.pauseablePlacement.commit(t.browser.now()),n=!0),a&&this.pauseablePlacement.placement.setStale()),n||a)for(var f=0,m=this._order;f<m.length;f+=1){var g=m[f],v=this._layers[g];"symbol"===v.type&&this.placement.updateLayerOpacities(v,s[v.source]);}return !this.pauseablePlacement.isDone()||this.placement.hasTransitions(t.browser.now())},i.prototype._releaseSymbolFadeTiles=function(){for(var t in this.sourceCaches)this.sourceCaches[t].releaseSymbolFadeTiles();},i.prototype.getImages=function(t,e,i){this.imageManager.getImages(e.icons,i);},i.prototype.getGlyphs=function(t,e,i){this.glyphManager.getGlyphs(e.stacks,i);},i.prototype.getResource=function(e,i,o){return t.makeRequest(i,o)},i}(t.Evented);Fe.getSourceType=function(t){return A[t]},Fe.setSourceType=function(t,e){A[t]=e;},Fe.registerForPluginAvailability=t.registerForPluginAvailability;var Ue=t.createLayout([{name:"a_pos",type:"Int16",components:2}]),Ne=hi("#ifdef GL_ES\nprecision mediump float;\n#else\n#if !defined(lowp)\n#define lowp\n#endif\n#if !defined(mediump)\n#define mediump\n#endif\n#if !defined(highp)\n#define highp\n#endif\n#endif","#ifdef GL_ES\nprecision highp float;\n#else\n#if !defined(lowp)\n#define lowp\n#endif\n#if !defined(mediump)\n#define mediump\n#endif\n#if !defined(highp)\n#define highp\n#endif\n#endif\nvec2 unpack_float(const float packedValue) {int packedIntValue=int(packedValue);int v0=packedIntValue/256;return vec2(v0,packedIntValue-v0*256);}vec2 unpack_opacity(const float packedOpacity) {int intOpacity=int(packedOpacity)/2;return vec2(float(intOpacity)/127.0,mod(packedOpacity,2.0));}vec4 decode_color(const vec2 encodedColor) {return vec4(unpack_float(encodedColor[0])/255.0,unpack_float(encodedColor[1])/255.0\n);}float unpack_mix_vec2(const vec2 packedValue,const float t) {return mix(packedValue[0],packedValue[1],t);}vec4 unpack_mix_color(const vec4 packedColors,const float t) {vec4 minColor=decode_color(vec2(packedColors[0],packedColors[1]));vec4 maxColor=decode_color(vec2(packedColors[2],packedColors[3]));return mix(minColor,maxColor,t);}vec2 get_pattern_pos(const vec2 pixel_coord_upper,const vec2 pixel_coord_lower,const vec2 pattern_size,const float tile_units_to_pixels,const vec2 pos) {vec2 offset=mod(mod(mod(pixel_coord_upper,pattern_size)*256.0,pattern_size)*256.0+pixel_coord_lower,pattern_size);return (tile_units_to_pixels*pos+offset)/pattern_size;}"),Ze=hi("uniform vec4 u_color;uniform float u_opacity;void main() {gl_FragColor=u_color*u_opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","attribute vec2 a_pos;uniform mat4 u_matrix;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);}"),Ve=hi("uniform vec2 u_pattern_tl_a;uniform vec2 u_pattern_br_a;uniform vec2 u_pattern_tl_b;uniform vec2 u_pattern_br_b;uniform vec2 u_texsize;uniform float u_mix;uniform float u_opacity;uniform sampler2D u_image;varying vec2 v_pos_a;varying vec2 v_pos_b;void main() {vec2 imagecoord=mod(v_pos_a,1.0);vec2 pos=mix(u_pattern_tl_a/u_texsize,u_pattern_br_a/u_texsize,imagecoord);vec4 color1=texture2D(u_image,pos);vec2 imagecoord_b=mod(v_pos_b,1.0);vec2 pos2=mix(u_pattern_tl_b/u_texsize,u_pattern_br_b/u_texsize,imagecoord_b);vec4 color2=texture2D(u_image,pos2);gl_FragColor=mix(color1,color2,u_mix)*u_opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_pattern_size_a;uniform vec2 u_pattern_size_b;uniform vec2 u_pixel_coord_upper;uniform vec2 u_pixel_coord_lower;uniform float u_scale_a;uniform float u_scale_b;uniform float u_tile_units_to_pixels;attribute vec2 a_pos;varying vec2 v_pos_a;varying vec2 v_pos_b;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);v_pos_a=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,u_scale_a*u_pattern_size_a,u_tile_units_to_pixels,a_pos);v_pos_b=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,u_scale_b*u_pattern_size_b,u_tile_units_to_pixels,a_pos);}"),qe=hi("varying vec3 v_data;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define mediump float radius\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define highp vec4 stroke_color\n#pragma mapbox: define mediump float stroke_width\n#pragma mapbox: define lowp float stroke_opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize mediump float radius\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize highp vec4 stroke_color\n#pragma mapbox: initialize mediump float stroke_width\n#pragma mapbox: initialize lowp float stroke_opacity\nvec2 extrude=v_data.xy;float extrude_length=length(extrude);lowp float antialiasblur=v_data.z;float antialiased_blur=-max(blur,antialiasblur);float opacity_t=smoothstep(0.0,antialiased_blur,extrude_length-1.0);float color_t=stroke_width < 0.01 ? 0.0 : smoothstep(antialiased_blur,0.0,extrude_length-radius/(radius+stroke_width));gl_FragColor=opacity_t*mix(color*opacity,stroke_color*stroke_opacity,color_t);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform bool u_scale_with_map;uniform bool u_pitch_with_map;uniform vec2 u_extrude_scale;uniform lowp float u_device_pixel_ratio;uniform highp float u_camera_to_center_distance;attribute vec2 a_pos;varying vec3 v_data;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define mediump float radius\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define highp vec4 stroke_color\n#pragma mapbox: define mediump float stroke_width\n#pragma mapbox: define lowp float stroke_opacity\nvoid main(void) {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize mediump float radius\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize highp vec4 stroke_color\n#pragma mapbox: initialize mediump float stroke_width\n#pragma mapbox: initialize lowp float stroke_opacity\nvec2 extrude=vec2(mod(a_pos,2.0)*2.0-1.0);vec2 circle_center=floor(a_pos*0.5);if (u_pitch_with_map) {vec2 corner_position=circle_center;if (u_scale_with_map) {corner_position+=extrude*(radius+stroke_width)*u_extrude_scale;} else {vec4 projected_center=u_matrix*vec4(circle_center,0,1);corner_position+=extrude*(radius+stroke_width)*u_extrude_scale*(projected_center.w/u_camera_to_center_distance);}gl_Position=u_matrix*vec4(corner_position,0,1);} else {gl_Position=u_matrix*vec4(circle_center,0,1);if (u_scale_with_map) {gl_Position.xy+=extrude*(radius+stroke_width)*u_extrude_scale*u_camera_to_center_distance;} else {gl_Position.xy+=extrude*(radius+stroke_width)*u_extrude_scale*gl_Position.w;}}lowp float antialiasblur=1.0/u_device_pixel_ratio/(radius+stroke_width);v_data=vec3(extrude.x,extrude.y,antialiasblur);}"),je=hi("void main() {gl_FragColor=vec4(1.0);}","attribute vec2 a_pos;uniform mat4 u_matrix;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);}"),Ge=hi("uniform highp float u_intensity;varying vec2 v_extrude;\n#pragma mapbox: define highp float weight\n#define GAUSS_COEF 0.3989422804014327\nvoid main() {\n#pragma mapbox: initialize highp float weight\nfloat d=-0.5*3.0*3.0*dot(v_extrude,v_extrude);float val=weight*u_intensity*GAUSS_COEF*exp(d);gl_FragColor=vec4(val,1.0,1.0,1.0);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform float u_extrude_scale;uniform float u_opacity;uniform float u_intensity;attribute vec2 a_pos;varying vec2 v_extrude;\n#pragma mapbox: define highp float weight\n#pragma mapbox: define mediump float radius\nconst highp float ZERO=1.0/255.0/16.0;\n#define GAUSS_COEF 0.3989422804014327\nvoid main(void) {\n#pragma mapbox: initialize highp float weight\n#pragma mapbox: initialize mediump float radius\nvec2 unscaled_extrude=vec2(mod(a_pos,2.0)*2.0-1.0);float S=sqrt(-2.0*log(ZERO/weight/u_intensity/GAUSS_COEF))/3.0;v_extrude=S*unscaled_extrude;vec2 extrude=v_extrude*radius*u_extrude_scale;vec4 pos=vec4(floor(a_pos*0.5)+extrude,0,1);gl_Position=u_matrix*pos;}"),We=hi("uniform sampler2D u_image;uniform sampler2D u_color_ramp;uniform float u_opacity;varying vec2 v_pos;void main() {float t=texture2D(u_image,v_pos).r;vec4 color=texture2D(u_color_ramp,vec2(t,0.5));gl_FragColor=color*u_opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(0.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_world;attribute vec2 a_pos;varying vec2 v_pos;void main() {gl_Position=u_matrix*vec4(a_pos*u_world,0,1);v_pos.x=a_pos.x;v_pos.y=1.0-a_pos.y;}"),Xe=hi("varying float v_placed;varying float v_notUsed;void main() {float alpha=0.5;gl_FragColor=vec4(1.0,0.0,0.0,1.0)*alpha;if (v_placed > 0.5) {gl_FragColor=vec4(0.0,0.0,1.0,0.5)*alpha;}if (v_notUsed > 0.5) {gl_FragColor*=.1;}}","attribute vec2 a_pos;attribute vec2 a_anchor_pos;attribute vec2 a_extrude;attribute vec2 a_placed;attribute vec2 a_shift;uniform mat4 u_matrix;uniform vec2 u_extrude_scale;uniform float u_camera_to_center_distance;varying float v_placed;varying float v_notUsed;void main() {vec4 projectedPoint=u_matrix*vec4(a_anchor_pos,0,1);highp float camera_to_anchor_distance=projectedPoint.w;highp float collision_perspective_ratio=clamp(0.5+0.5*(u_camera_to_center_distance/camera_to_anchor_distance),0.0,4.0);gl_Position=u_matrix*vec4(a_pos,0.0,1.0);gl_Position.xy+=(a_extrude+a_shift)*u_extrude_scale*gl_Position.w*collision_perspective_ratio;v_placed=a_placed.x;v_notUsed=a_placed.y;}"),He=hi("uniform float u_overscale_factor;varying float v_placed;varying float v_notUsed;varying float v_radius;varying vec2 v_extrude;varying vec2 v_extrude_scale;void main() {float alpha=0.5;vec4 color=vec4(1.0,0.0,0.0,1.0)*alpha;if (v_placed > 0.5) {color=vec4(0.0,0.0,1.0,0.5)*alpha;}if (v_notUsed > 0.5) {color*=.2;}float extrude_scale_length=length(v_extrude_scale);float extrude_length=length(v_extrude)*extrude_scale_length;float stroke_width=15.0*extrude_scale_length/u_overscale_factor;float radius=v_radius*extrude_scale_length;float distance_to_edge=abs(extrude_length-radius);float opacity_t=smoothstep(-stroke_width,0.0,-distance_to_edge);gl_FragColor=opacity_t*color;}","attribute vec2 a_pos;attribute vec2 a_anchor_pos;attribute vec2 a_extrude;attribute vec2 a_placed;uniform mat4 u_matrix;uniform vec2 u_extrude_scale;uniform float u_camera_to_center_distance;varying float v_placed;varying float v_notUsed;varying float v_radius;varying vec2 v_extrude;varying vec2 v_extrude_scale;void main() {vec4 projectedPoint=u_matrix*vec4(a_anchor_pos,0,1);highp float camera_to_anchor_distance=projectedPoint.w;highp float collision_perspective_ratio=clamp(0.5+0.5*(u_camera_to_center_distance/camera_to_anchor_distance),0.0,4.0);gl_Position=u_matrix*vec4(a_pos,0.0,1.0);highp float padding_factor=1.2;gl_Position.xy+=a_extrude*u_extrude_scale*padding_factor*gl_Position.w*collision_perspective_ratio;v_placed=a_placed.x;v_notUsed=a_placed.y;v_radius=abs(a_extrude.y);v_extrude=a_extrude*padding_factor;v_extrude_scale=u_extrude_scale*u_camera_to_center_distance*collision_perspective_ratio;}"),Ke=hi("uniform highp vec4 u_color;void main() {gl_FragColor=u_color;}","attribute vec2 a_pos;uniform mat4 u_matrix;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);}"),Je=hi("#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float opacity\ngl_FragColor=color*opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","attribute vec2 a_pos;uniform mat4 u_matrix;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float opacity\ngl_Position=u_matrix*vec4(a_pos,0,1);}"),Ye=hi("varying vec2 v_pos;\n#pragma mapbox: define highp vec4 outline_color\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 outline_color\n#pragma mapbox: initialize lowp float opacity\nfloat dist=length(v_pos-gl_FragCoord.xy);float alpha=1.0-smoothstep(0.0,1.0,dist);gl_FragColor=outline_color*(alpha*opacity);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","attribute vec2 a_pos;uniform mat4 u_matrix;uniform vec2 u_world;varying vec2 v_pos;\n#pragma mapbox: define highp vec4 outline_color\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 outline_color\n#pragma mapbox: initialize lowp float opacity\ngl_Position=u_matrix*vec4(a_pos,0,1);v_pos=(gl_Position.xy/gl_Position.w+1.0)/2.0*u_world;}"),Qe=hi("uniform vec2 u_texsize;uniform sampler2D u_image;uniform float u_fade;varying vec2 v_pos_a;varying vec2 v_pos_b;varying vec2 v_pos;\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;vec2 imagecoord=mod(v_pos_a,1.0);vec2 pos=mix(pattern_tl_a/u_texsize,pattern_br_a/u_texsize,imagecoord);vec4 color1=texture2D(u_image,pos);vec2 imagecoord_b=mod(v_pos_b,1.0);vec2 pos2=mix(pattern_tl_b/u_texsize,pattern_br_b/u_texsize,imagecoord_b);vec4 color2=texture2D(u_image,pos2);float dist=length(v_pos-gl_FragCoord.xy);float alpha=1.0-smoothstep(0.0,1.0,dist);gl_FragColor=mix(color1,color2,u_fade)*alpha*opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_world;uniform vec2 u_pixel_coord_upper;uniform vec2 u_pixel_coord_lower;uniform vec4 u_scale;attribute vec2 a_pos;varying vec2 v_pos_a;varying vec2 v_pos_b;varying vec2 v_pos;\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;float pixelRatio=u_scale.x;float tileRatio=u_scale.y;float fromScale=u_scale.z;float toScale=u_scale.w;gl_Position=u_matrix*vec4(a_pos,0,1);vec2 display_size_a=vec2((pattern_br_a.x-pattern_tl_a.x)/pixelRatio,(pattern_br_a.y-pattern_tl_a.y)/pixelRatio);vec2 display_size_b=vec2((pattern_br_b.x-pattern_tl_b.x)/pixelRatio,(pattern_br_b.y-pattern_tl_b.y)/pixelRatio);v_pos_a=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,fromScale*display_size_a,tileRatio,a_pos);v_pos_b=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,toScale*display_size_b,tileRatio,a_pos);v_pos=(gl_Position.xy/gl_Position.w+1.0)/2.0*u_world;}"),$e=hi("uniform vec2 u_texsize;uniform float u_fade;uniform sampler2D u_image;varying vec2 v_pos_a;varying vec2 v_pos_b;\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;vec2 imagecoord=mod(v_pos_a,1.0);vec2 pos=mix(pattern_tl_a/u_texsize,pattern_br_a/u_texsize,imagecoord);vec4 color1=texture2D(u_image,pos);vec2 imagecoord_b=mod(v_pos_b,1.0);vec2 pos2=mix(pattern_tl_b/u_texsize,pattern_br_b/u_texsize,imagecoord_b);vec4 color2=texture2D(u_image,pos2);gl_FragColor=mix(color1,color2,u_fade)*opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_pixel_coord_upper;uniform vec2 u_pixel_coord_lower;uniform vec4 u_scale;attribute vec2 a_pos;varying vec2 v_pos_a;varying vec2 v_pos_b;\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;float pixelRatio=u_scale.x;float tileZoomRatio=u_scale.y;float fromScale=u_scale.z;float toScale=u_scale.w;vec2 display_size_a=vec2((pattern_br_a.x-pattern_tl_a.x)/pixelRatio,(pattern_br_a.y-pattern_tl_a.y)/pixelRatio);vec2 display_size_b=vec2((pattern_br_b.x-pattern_tl_b.x)/pixelRatio,(pattern_br_b.y-pattern_tl_b.y)/pixelRatio);gl_Position=u_matrix*vec4(a_pos,0,1);v_pos_a=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,fromScale*display_size_a,tileZoomRatio,a_pos);v_pos_b=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,toScale*display_size_b,tileZoomRatio,a_pos);}"),ti=hi("varying vec4 v_color;void main() {gl_FragColor=v_color;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec3 u_lightcolor;uniform lowp vec3 u_lightpos;uniform lowp float u_lightintensity;uniform float u_vertical_gradient;uniform lowp float u_opacity;attribute vec2 a_pos;attribute vec4 a_normal_ed;varying vec4 v_color;\n#pragma mapbox: define highp float base\n#pragma mapbox: define highp float height\n#pragma mapbox: define highp vec4 color\nvoid main() {\n#pragma mapbox: initialize highp float base\n#pragma mapbox: initialize highp float height\n#pragma mapbox: initialize highp vec4 color\nvec3 normal=a_normal_ed.xyz;base=max(0.0,base);height=max(0.0,height);float t=mod(normal.x,2.0);gl_Position=u_matrix*vec4(a_pos,t > 0.0 ? height : base,1);float colorvalue=color.r*0.2126+color.g*0.7152+color.b*0.0722;v_color=vec4(0.0,0.0,0.0,1.0);vec4 ambientlight=vec4(0.03,0.03,0.03,1.0);color+=ambientlight;float directional=clamp(dot(normal/16384.0,u_lightpos),0.0,1.0);directional=mix((1.0-u_lightintensity),max((1.0-colorvalue+u_lightintensity),1.0),directional);if (normal.y !=0.0) {directional*=((1.0-u_vertical_gradient)+(u_vertical_gradient*clamp((t+base)*pow(height/150.0,0.5),mix(0.7,0.98,1.0-u_lightintensity),1.0)));}v_color.r+=clamp(color.r*directional*u_lightcolor.r,mix(0.0,0.3,1.0-u_lightcolor.r),1.0);v_color.g+=clamp(color.g*directional*u_lightcolor.g,mix(0.0,0.3,1.0-u_lightcolor.g),1.0);v_color.b+=clamp(color.b*directional*u_lightcolor.b,mix(0.0,0.3,1.0-u_lightcolor.b),1.0);v_color*=u_opacity;}"),ei=hi("uniform vec2 u_texsize;uniform float u_fade;uniform sampler2D u_image;varying vec2 v_pos_a;varying vec2 v_pos_b;varying vec4 v_lighting;\n#pragma mapbox: define lowp float base\n#pragma mapbox: define lowp float height\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float base\n#pragma mapbox: initialize lowp float height\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;vec2 imagecoord=mod(v_pos_a,1.0);vec2 pos=mix(pattern_tl_a/u_texsize,pattern_br_a/u_texsize,imagecoord);vec4 color1=texture2D(u_image,pos);vec2 imagecoord_b=mod(v_pos_b,1.0);vec2 pos2=mix(pattern_tl_b/u_texsize,pattern_br_b/u_texsize,imagecoord_b);vec4 color2=texture2D(u_image,pos2);vec4 mixedColor=mix(color1,color2,u_fade);gl_FragColor=mixedColor*v_lighting;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_pixel_coord_upper;uniform vec2 u_pixel_coord_lower;uniform float u_height_factor;uniform vec4 u_scale;uniform float u_vertical_gradient;uniform lowp float u_opacity;uniform vec3 u_lightcolor;uniform lowp vec3 u_lightpos;uniform lowp float u_lightintensity;attribute vec2 a_pos;attribute vec4 a_normal_ed;varying vec2 v_pos_a;varying vec2 v_pos_b;varying vec4 v_lighting;\n#pragma mapbox: define lowp float base\n#pragma mapbox: define lowp float height\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float base\n#pragma mapbox: initialize lowp float height\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;float pixelRatio=u_scale.x;float tileRatio=u_scale.y;float fromScale=u_scale.z;float toScale=u_scale.w;vec3 normal=a_normal_ed.xyz;float edgedistance=a_normal_ed.w;vec2 display_size_a=vec2((pattern_br_a.x-pattern_tl_a.x)/pixelRatio,(pattern_br_a.y-pattern_tl_a.y)/pixelRatio);vec2 display_size_b=vec2((pattern_br_b.x-pattern_tl_b.x)/pixelRatio,(pattern_br_b.y-pattern_tl_b.y)/pixelRatio);base=max(0.0,base);height=max(0.0,height);float t=mod(normal.x,2.0);float z=t > 0.0 ? height : base;gl_Position=u_matrix*vec4(a_pos,z,1);vec2 pos=normal.x==1.0 && normal.y==0.0 && normal.z==16384.0\n? a_pos\n: vec2(edgedistance,z*u_height_factor);v_pos_a=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,fromScale*display_size_a,tileRatio,pos);v_pos_b=get_pattern_pos(u_pixel_coord_upper,u_pixel_coord_lower,toScale*display_size_b,tileRatio,pos);v_lighting=vec4(0.0,0.0,0.0,1.0);float directional=clamp(dot(normal/16383.0,u_lightpos),0.0,1.0);directional=mix((1.0-u_lightintensity),max((0.5+u_lightintensity),1.0),directional);if (normal.y !=0.0) {directional*=((1.0-u_vertical_gradient)+(u_vertical_gradient*clamp((t+base)*pow(height/150.0,0.5),mix(0.7,0.98,1.0-u_lightintensity),1.0)));}v_lighting.rgb+=clamp(directional*u_lightcolor,mix(vec3(0.0),vec3(0.3),1.0-u_lightcolor),vec3(1.0));v_lighting*=u_opacity;}"),ii=hi("#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D u_image;varying vec2 v_pos;uniform vec2 u_dimension;uniform float u_zoom;uniform float u_maxzoom;uniform vec4 u_unpack;float getElevation(vec2 coord,float bias) {vec4 data=texture2D(u_image,coord)*255.0;data.a=-1.0;return dot(data,u_unpack)/4.0;}void main() {vec2 epsilon=1.0/u_dimension;float a=getElevation(v_pos+vec2(-epsilon.x,-epsilon.y),0.0);float b=getElevation(v_pos+vec2(0,-epsilon.y),0.0);float c=getElevation(v_pos+vec2(epsilon.x,-epsilon.y),0.0);float d=getElevation(v_pos+vec2(-epsilon.x,0),0.0);float e=getElevation(v_pos,0.0);float f=getElevation(v_pos+vec2(epsilon.x,0),0.0);float g=getElevation(v_pos+vec2(-epsilon.x,epsilon.y),0.0);float h=getElevation(v_pos+vec2(0,epsilon.y),0.0);float i=getElevation(v_pos+vec2(epsilon.x,epsilon.y),0.0);float exaggeration=u_zoom < 2.0 ? 0.4 : u_zoom < 4.5 ? 0.35 : 0.3;vec2 deriv=vec2((c+f+f+i)-(a+d+d+g),(g+h+h+i)-(a+b+b+c))/ pow(2.0,(u_zoom-u_maxzoom)*exaggeration+19.2562-u_zoom);gl_FragColor=clamp(vec4(deriv.x/2.0+0.5,deriv.y/2.0+0.5,1.0,1.0),0.0,1.0);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_dimension;attribute vec2 a_pos;attribute vec2 a_texture_pos;varying vec2 v_pos;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);highp vec2 epsilon=1.0/u_dimension;float scale=(u_dimension.x-2.0)/u_dimension.x;v_pos=(a_texture_pos/8192.0)*scale+epsilon;}"),oi=hi("uniform sampler2D u_image;varying vec2 v_pos;uniform vec2 u_latrange;uniform vec2 u_light;uniform vec4 u_shadow;uniform vec4 u_highlight;uniform vec4 u_accent;\n#define PI 3.141592653589793\nvoid main() {vec4 pixel=texture2D(u_image,v_pos);vec2 deriv=((pixel.rg*2.0)-1.0);float scaleFactor=cos(radians((u_latrange[0]-u_latrange[1])*(1.0-v_pos.y)+u_latrange[1]));float slope=atan(1.25*length(deriv)/scaleFactor);float aspect=deriv.x !=0.0 ? atan(deriv.y,-deriv.x) : PI/2.0*(deriv.y > 0.0 ? 1.0 :-1.0);float intensity=u_light.x;float azimuth=u_light.y+PI;float base=1.875-intensity*1.75;float maxValue=0.5*PI;float scaledSlope=intensity !=0.5 ? ((pow(base,slope)-1.0)/(pow(base,maxValue)-1.0))*maxValue : slope;float accent=cos(scaledSlope);vec4 accent_color=(1.0-accent)*u_accent*clamp(intensity*2.0,0.0,1.0);float shade=abs(mod((aspect+azimuth)/PI+0.5,2.0)-1.0);vec4 shade_color=mix(u_shadow,u_highlight,shade)*sin(scaledSlope)*clamp(intensity*2.0,0.0,1.0);gl_FragColor=accent_color*(1.0-shade_color.a)+shade_color;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;attribute vec2 a_pos;attribute vec2 a_texture_pos;varying vec2 v_pos;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);v_pos=a_texture_pos/8192.0;}"),ri=hi("uniform lowp float u_device_pixel_ratio;varying vec2 v_width2;varying vec2 v_normal;varying float v_gamma_scale;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\nfloat dist=length(v_normal)*v_width2.s;float blur2=(blur+1.0/u_device_pixel_ratio)*v_gamma_scale;float alpha=clamp(min(dist-(v_width2.t-blur2),v_width2.s-dist)/blur2,0.0,1.0);gl_FragColor=color*(alpha*opacity);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","\n#define scale 0.015873016\nattribute vec2 a_pos_normal;attribute vec4 a_data;uniform mat4 u_matrix;uniform mediump float u_ratio;uniform vec2 u_units_to_pixels;uniform lowp float u_device_pixel_ratio;varying vec2 v_normal;varying vec2 v_width2;varying float v_gamma_scale;varying highp float v_linesofar;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define mediump float gapwidth\n#pragma mapbox: define lowp float offset\n#pragma mapbox: define mediump float width\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump float gapwidth\n#pragma mapbox: initialize lowp float offset\n#pragma mapbox: initialize mediump float width\nfloat ANTIALIASING=1.0/u_device_pixel_ratio/2.0;vec2 a_extrude=a_data.xy-128.0;float a_direction=mod(a_data.z,4.0)-1.0;v_linesofar=(floor(a_data.z/4.0)+a_data.w*64.0)*2.0;vec2 pos=floor(a_pos_normal*0.5);mediump vec2 normal=a_pos_normal-2.0*pos;normal.y=normal.y*2.0-1.0;v_normal=normal;gapwidth=gapwidth/2.0;float halfwidth=width/2.0;offset=-1.0*offset;float inset=gapwidth+(gapwidth > 0.0 ? ANTIALIASING : 0.0);float outset=gapwidth+halfwidth*(gapwidth > 0.0 ? 2.0 : 1.0)+(halfwidth==0.0 ? 0.0 : ANTIALIASING);mediump vec2 dist=outset*a_extrude*scale;mediump float u=0.5*a_direction;mediump float t=1.0-abs(u);mediump vec2 offset2=offset*a_extrude*scale*normal.y*mat2(t,-u,u,t);vec4 projected_extrude=u_matrix*vec4(dist/u_ratio,0.0,0.0);gl_Position=u_matrix*vec4(pos+offset2/u_ratio,0.0,1.0)+projected_extrude;float extrude_length_without_perspective=length(dist);float extrude_length_with_perspective=length(projected_extrude.xy/gl_Position.w*u_units_to_pixels);v_gamma_scale=extrude_length_without_perspective/extrude_length_with_perspective;v_width2=vec2(outset,inset);}"),ai=hi("uniform lowp float u_device_pixel_ratio;uniform sampler2D u_image;varying vec2 v_width2;varying vec2 v_normal;varying float v_gamma_scale;varying highp float v_lineprogress;\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\nfloat dist=length(v_normal)*v_width2.s;float blur2=(blur+1.0/u_device_pixel_ratio)*v_gamma_scale;float alpha=clamp(min(dist-(v_width2.t-blur2),v_width2.s-dist)/blur2,0.0,1.0);vec4 color=texture2D(u_image,vec2(v_lineprogress,0.5));gl_FragColor=color*(alpha*opacity);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","\n#define MAX_LINE_DISTANCE 32767.0\n#define scale 0.015873016\nattribute vec2 a_pos_normal;attribute vec4 a_data;uniform mat4 u_matrix;uniform mediump float u_ratio;uniform lowp float u_device_pixel_ratio;uniform vec2 u_units_to_pixels;varying vec2 v_normal;varying vec2 v_width2;varying float v_gamma_scale;varying highp float v_lineprogress;\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define mediump float gapwidth\n#pragma mapbox: define lowp float offset\n#pragma mapbox: define mediump float width\nvoid main() {\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump float gapwidth\n#pragma mapbox: initialize lowp float offset\n#pragma mapbox: initialize mediump float width\nfloat ANTIALIASING=1.0/u_device_pixel_ratio/2.0;vec2 a_extrude=a_data.xy-128.0;float a_direction=mod(a_data.z,4.0)-1.0;v_lineprogress=(floor(a_data.z/4.0)+a_data.w*64.0)*2.0/MAX_LINE_DISTANCE;vec2 pos=floor(a_pos_normal*0.5);mediump vec2 normal=a_pos_normal-2.0*pos;normal.y=normal.y*2.0-1.0;v_normal=normal;gapwidth=gapwidth/2.0;float halfwidth=width/2.0;offset=-1.0*offset;float inset=gapwidth+(gapwidth > 0.0 ? ANTIALIASING : 0.0);float outset=gapwidth+halfwidth*(gapwidth > 0.0 ? 2.0 : 1.0)+(halfwidth==0.0 ? 0.0 : ANTIALIASING);mediump vec2 dist=outset*a_extrude*scale;mediump float u=0.5*a_direction;mediump float t=1.0-abs(u);mediump vec2 offset2=offset*a_extrude*scale*normal.y*mat2(t,-u,u,t);vec4 projected_extrude=u_matrix*vec4(dist/u_ratio,0.0,0.0);gl_Position=u_matrix*vec4(pos+offset2/u_ratio,0.0,1.0)+projected_extrude;float extrude_length_without_perspective=length(dist);float extrude_length_with_perspective=length(projected_extrude.xy/gl_Position.w*u_units_to_pixels);v_gamma_scale=extrude_length_without_perspective/extrude_length_with_perspective;v_width2=vec2(outset,inset);}"),ni=hi("uniform lowp float u_device_pixel_ratio;uniform vec2 u_texsize;uniform float u_fade;uniform mediump vec4 u_scale;uniform sampler2D u_image;varying vec2 v_normal;varying vec2 v_width2;varying float v_linesofar;varying float v_gamma_scale;\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\nvec2 pattern_tl_a=pattern_from.xy;vec2 pattern_br_a=pattern_from.zw;vec2 pattern_tl_b=pattern_to.xy;vec2 pattern_br_b=pattern_to.zw;float pixelRatio=u_scale.x;float tileZoomRatio=u_scale.y;float fromScale=u_scale.z;float toScale=u_scale.w;vec2 display_size_a=vec2((pattern_br_a.x-pattern_tl_a.x)/pixelRatio,(pattern_br_a.y-pattern_tl_a.y)/pixelRatio);vec2 display_size_b=vec2((pattern_br_b.x-pattern_tl_b.x)/pixelRatio,(pattern_br_b.y-pattern_tl_b.y)/pixelRatio);vec2 pattern_size_a=vec2(display_size_a.x*fromScale/tileZoomRatio,display_size_a.y);vec2 pattern_size_b=vec2(display_size_b.x*toScale/tileZoomRatio,display_size_b.y);float dist=length(v_normal)*v_width2.s;float blur2=(blur+1.0/u_device_pixel_ratio)*v_gamma_scale;float alpha=clamp(min(dist-(v_width2.t-blur2),v_width2.s-dist)/blur2,0.0,1.0);float x_a=mod(v_linesofar/pattern_size_a.x,1.0);float x_b=mod(v_linesofar/pattern_size_b.x,1.0);float y_a=0.5+(v_normal.y*clamp(v_width2.s,0.0,(pattern_size_a.y+2.0)/2.0)/pattern_size_a.y);float y_b=0.5+(v_normal.y*clamp(v_width2.s,0.0,(pattern_size_b.y+2.0)/2.0)/pattern_size_b.y);vec2 pos_a=mix(pattern_tl_a/u_texsize,pattern_br_a/u_texsize,vec2(x_a,y_a));vec2 pos_b=mix(pattern_tl_b/u_texsize,pattern_br_b/u_texsize,vec2(x_b,y_b));vec4 color=mix(texture2D(u_image,pos_a),texture2D(u_image,pos_b),u_fade);gl_FragColor=color*alpha*opacity;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","\n#define scale 0.015873016\n#define LINE_DISTANCE_SCALE 2.0\nattribute vec2 a_pos_normal;attribute vec4 a_data;uniform mat4 u_matrix;uniform vec2 u_units_to_pixels;uniform mediump float u_ratio;uniform lowp float u_device_pixel_ratio;varying vec2 v_normal;varying vec2 v_width2;varying float v_linesofar;varying float v_gamma_scale;\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp float offset\n#pragma mapbox: define mediump float gapwidth\n#pragma mapbox: define mediump float width\n#pragma mapbox: define lowp vec4 pattern_from\n#pragma mapbox: define lowp vec4 pattern_to\nvoid main() {\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize lowp float offset\n#pragma mapbox: initialize mediump float gapwidth\n#pragma mapbox: initialize mediump float width\n#pragma mapbox: initialize mediump vec4 pattern_from\n#pragma mapbox: initialize mediump vec4 pattern_to\nfloat ANTIALIASING=1.0/u_device_pixel_ratio/2.0;vec2 a_extrude=a_data.xy-128.0;float a_direction=mod(a_data.z,4.0)-1.0;float a_linesofar=(floor(a_data.z/4.0)+a_data.w*64.0)*LINE_DISTANCE_SCALE;vec2 pos=floor(a_pos_normal*0.5);mediump vec2 normal=a_pos_normal-2.0*pos;normal.y=normal.y*2.0-1.0;v_normal=normal;gapwidth=gapwidth/2.0;float halfwidth=width/2.0;offset=-1.0*offset;float inset=gapwidth+(gapwidth > 0.0 ? ANTIALIASING : 0.0);float outset=gapwidth+halfwidth*(gapwidth > 0.0 ? 2.0 : 1.0)+(halfwidth==0.0 ? 0.0 : ANTIALIASING);mediump vec2 dist=outset*a_extrude*scale;mediump float u=0.5*a_direction;mediump float t=1.0-abs(u);mediump vec2 offset2=offset*a_extrude*scale*normal.y*mat2(t,-u,u,t);vec4 projected_extrude=u_matrix*vec4(dist/u_ratio,0.0,0.0);gl_Position=u_matrix*vec4(pos+offset2/u_ratio,0.0,1.0)+projected_extrude;float extrude_length_without_perspective=length(dist);float extrude_length_with_perspective=length(projected_extrude.xy/gl_Position.w*u_units_to_pixels);v_gamma_scale=extrude_length_without_perspective/extrude_length_with_perspective;v_linesofar=a_linesofar;v_width2=vec2(outset,inset);}"),si=hi("uniform lowp float u_device_pixel_ratio;uniform sampler2D u_image;uniform float u_sdfgamma;uniform float u_mix;varying vec2 v_normal;varying vec2 v_width2;varying vec2 v_tex_a;varying vec2 v_tex_b;varying float v_gamma_scale;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define mediump float width\n#pragma mapbox: define lowp float floorwidth\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump float width\n#pragma mapbox: initialize lowp float floorwidth\nfloat dist=length(v_normal)*v_width2.s;float blur2=(blur+1.0/u_device_pixel_ratio)*v_gamma_scale;float alpha=clamp(min(dist-(v_width2.t-blur2),v_width2.s-dist)/blur2,0.0,1.0);float sdfdist_a=texture2D(u_image,v_tex_a).a;float sdfdist_b=texture2D(u_image,v_tex_b).a;float sdfdist=mix(sdfdist_a,sdfdist_b,u_mix);alpha*=smoothstep(0.5-u_sdfgamma/floorwidth,0.5+u_sdfgamma/floorwidth,sdfdist);gl_FragColor=color*(alpha*opacity);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","\n#define scale 0.015873016\n#define LINE_DISTANCE_SCALE 2.0\nattribute vec2 a_pos_normal;attribute vec4 a_data;uniform mat4 u_matrix;uniform mediump float u_ratio;uniform lowp float u_device_pixel_ratio;uniform vec2 u_patternscale_a;uniform float u_tex_y_a;uniform vec2 u_patternscale_b;uniform float u_tex_y_b;uniform vec2 u_units_to_pixels;varying vec2 v_normal;varying vec2 v_width2;varying vec2 v_tex_a;varying vec2 v_tex_b;varying float v_gamma_scale;\n#pragma mapbox: define highp vec4 color\n#pragma mapbox: define lowp float blur\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define mediump float gapwidth\n#pragma mapbox: define lowp float offset\n#pragma mapbox: define mediump float width\n#pragma mapbox: define lowp float floorwidth\nvoid main() {\n#pragma mapbox: initialize highp vec4 color\n#pragma mapbox: initialize lowp float blur\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize mediump float gapwidth\n#pragma mapbox: initialize lowp float offset\n#pragma mapbox: initialize mediump float width\n#pragma mapbox: initialize lowp float floorwidth\nfloat ANTIALIASING=1.0/u_device_pixel_ratio/2.0;vec2 a_extrude=a_data.xy-128.0;float a_direction=mod(a_data.z,4.0)-1.0;float a_linesofar=(floor(a_data.z/4.0)+a_data.w*64.0)*LINE_DISTANCE_SCALE;vec2 pos=floor(a_pos_normal*0.5);mediump vec2 normal=a_pos_normal-2.0*pos;normal.y=normal.y*2.0-1.0;v_normal=normal;gapwidth=gapwidth/2.0;float halfwidth=width/2.0;offset=-1.0*offset;float inset=gapwidth+(gapwidth > 0.0 ? ANTIALIASING : 0.0);float outset=gapwidth+halfwidth*(gapwidth > 0.0 ? 2.0 : 1.0)+(halfwidth==0.0 ? 0.0 : ANTIALIASING);mediump vec2 dist=outset*a_extrude*scale;mediump float u=0.5*a_direction;mediump float t=1.0-abs(u);mediump vec2 offset2=offset*a_extrude*scale*normal.y*mat2(t,-u,u,t);vec4 projected_extrude=u_matrix*vec4(dist/u_ratio,0.0,0.0);gl_Position=u_matrix*vec4(pos+offset2/u_ratio,0.0,1.0)+projected_extrude;float extrude_length_without_perspective=length(dist);float extrude_length_with_perspective=length(projected_extrude.xy/gl_Position.w*u_units_to_pixels);v_gamma_scale=extrude_length_without_perspective/extrude_length_with_perspective;v_tex_a=vec2(a_linesofar*u_patternscale_a.x/floorwidth,normal.y*u_patternscale_a.y+u_tex_y_a);v_tex_b=vec2(a_linesofar*u_patternscale_b.x/floorwidth,normal.y*u_patternscale_b.y+u_tex_y_b);v_width2=vec2(outset,inset);}"),li=hi("uniform float u_fade_t;uniform float u_opacity;uniform sampler2D u_image0;uniform sampler2D u_image1;varying vec2 v_pos0;varying vec2 v_pos1;uniform float u_brightness_low;uniform float u_brightness_high;uniform float u_saturation_factor;uniform float u_contrast_factor;uniform vec3 u_spin_weights;void main() {vec4 color0=texture2D(u_image0,v_pos0);vec4 color1=texture2D(u_image1,v_pos1);if (color0.a > 0.0) {color0.rgb=color0.rgb/color0.a;}if (color1.a > 0.0) {color1.rgb=color1.rgb/color1.a;}vec4 color=mix(color0,color1,u_fade_t);color.a*=u_opacity;vec3 rgb=color.rgb;rgb=vec3(dot(rgb,u_spin_weights.xyz),dot(rgb,u_spin_weights.zxy),dot(rgb,u_spin_weights.yzx));float average=(color.r+color.g+color.b)/3.0;rgb+=(average-rgb)*u_saturation_factor;rgb=(rgb-0.5)*u_contrast_factor+0.5;vec3 u_high_vec=vec3(u_brightness_low,u_brightness_low,u_brightness_low);vec3 u_low_vec=vec3(u_brightness_high,u_brightness_high,u_brightness_high);gl_FragColor=vec4(mix(u_high_vec,u_low_vec,rgb)*color.a,color.a);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","uniform mat4 u_matrix;uniform vec2 u_tl_parent;uniform float u_scale_parent;uniform float u_buffer_scale;attribute vec2 a_pos;attribute vec2 a_texture_pos;varying vec2 v_pos0;varying vec2 v_pos1;void main() {gl_Position=u_matrix*vec4(a_pos,0,1);v_pos0=(((a_texture_pos/8192.0)-0.5)/u_buffer_scale )+0.5;v_pos1=(v_pos0*u_scale_parent)+u_tl_parent;}"),ci=hi("uniform sampler2D u_texture;varying vec2 v_tex;varying float v_fade_opacity;\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\nlowp float alpha=opacity*v_fade_opacity;gl_FragColor=texture2D(u_texture,v_tex)*alpha;\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","const float PI=3.141592653589793;attribute vec4 a_pos_offset;attribute vec4 a_data;attribute vec3 a_projected_pos;attribute float a_fade_opacity;uniform bool u_is_size_zoom_constant;uniform bool u_is_size_feature_constant;uniform highp float u_size_t;uniform highp float u_size;uniform highp float u_camera_to_center_distance;uniform highp float u_pitch;uniform bool u_rotate_symbol;uniform highp float u_aspect_ratio;uniform float u_fade_change;uniform mat4 u_matrix;uniform mat4 u_label_plane_matrix;uniform mat4 u_coord_matrix;uniform bool u_is_text;uniform bool u_pitch_with_map;uniform vec2 u_texsize;varying vec2 v_tex;varying float v_fade_opacity;\n#pragma mapbox: define lowp float opacity\nvoid main() {\n#pragma mapbox: initialize lowp float opacity\nvec2 a_pos=a_pos_offset.xy;vec2 a_offset=a_pos_offset.zw;vec2 a_tex=a_data.xy;vec2 a_size=a_data.zw;highp float segment_angle=-a_projected_pos[2];float size;if (!u_is_size_zoom_constant && !u_is_size_feature_constant) {size=mix(a_size[0],a_size[1],u_size_t)/256.0;} else if (u_is_size_zoom_constant && !u_is_size_feature_constant) {size=a_size[0]/256.0;} else if (!u_is_size_zoom_constant && u_is_size_feature_constant) {size=u_size;} else {size=u_size;}vec4 projectedPoint=u_matrix*vec4(a_pos,0,1);highp float camera_to_anchor_distance=projectedPoint.w;highp float distance_ratio=u_pitch_with_map ?\ncamera_to_anchor_distance/u_camera_to_center_distance :\nu_camera_to_center_distance/camera_to_anchor_distance;highp float perspective_ratio=clamp(0.5+0.5*distance_ratio,0.0,4.0);size*=perspective_ratio;float fontScale=u_is_text ? size/24.0 : size;highp float symbol_rotation=0.0;if (u_rotate_symbol) {vec4 offsetProjectedPoint=u_matrix*vec4(a_pos+vec2(1,0),0,1);vec2 a=projectedPoint.xy/projectedPoint.w;vec2 b=offsetProjectedPoint.xy/offsetProjectedPoint.w;symbol_rotation=atan((b.y-a.y)/u_aspect_ratio,b.x-a.x);}highp float angle_sin=sin(segment_angle+symbol_rotation);highp float angle_cos=cos(segment_angle+symbol_rotation);mat2 rotation_matrix=mat2(angle_cos,-1.0*angle_sin,angle_sin,angle_cos);vec4 projected_pos=u_label_plane_matrix*vec4(a_projected_pos.xy,0.0,1.0);gl_Position=u_coord_matrix*vec4(projected_pos.xy/projected_pos.w+rotation_matrix*(a_offset/32.0*fontScale),0.0,1.0);v_tex=a_tex/u_texsize;vec2 fade_opacity=unpack_opacity(a_fade_opacity);float fade_change=fade_opacity[1] > 0.5 ? u_fade_change :-u_fade_change;v_fade_opacity=max(0.0,min(1.0,fade_opacity[0]+fade_change));}"),ui=hi("#define SDF_PX 8.0\nuniform bool u_is_halo;uniform sampler2D u_texture;uniform highp float u_gamma_scale;uniform lowp float u_device_pixel_ratio;uniform bool u_is_text;varying vec2 v_data0;varying vec3 v_data1;\n#pragma mapbox: define highp vec4 fill_color\n#pragma mapbox: define highp vec4 halo_color\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp float halo_width\n#pragma mapbox: define lowp float halo_blur\nvoid main() {\n#pragma mapbox: initialize highp vec4 fill_color\n#pragma mapbox: initialize highp vec4 halo_color\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize lowp float halo_width\n#pragma mapbox: initialize lowp float halo_blur\nfloat EDGE_GAMMA=0.105/u_device_pixel_ratio;vec2 tex=v_data0.xy;float gamma_scale=v_data1.x;float size=v_data1.y;float fade_opacity=v_data1[2];float fontScale=u_is_text ? size/24.0 : size;lowp vec4 color=fill_color;highp float gamma=EDGE_GAMMA/(fontScale*u_gamma_scale);lowp float buff=(256.0-64.0)/256.0;if (u_is_halo) {color=halo_color;gamma=(halo_blur*1.19/SDF_PX+EDGE_GAMMA)/(fontScale*u_gamma_scale);buff=(6.0-halo_width/fontScale)/SDF_PX;}lowp float dist=texture2D(u_texture,tex).a;highp float gamma_scaled=gamma*gamma_scale;highp float alpha=smoothstep(buff-gamma_scaled,buff+gamma_scaled,dist);gl_FragColor=color*(alpha*opacity*fade_opacity);\n#ifdef OVERDRAW_INSPECTOR\ngl_FragColor=vec4(1.0);\n#endif\n}","const float PI=3.141592653589793;attribute vec4 a_pos_offset;attribute vec4 a_data;attribute vec3 a_projected_pos;attribute float a_fade_opacity;uniform bool u_is_size_zoom_constant;uniform bool u_is_size_feature_constant;uniform highp float u_size_t;uniform highp float u_size;uniform mat4 u_matrix;uniform mat4 u_label_plane_matrix;uniform mat4 u_coord_matrix;uniform bool u_is_text;uniform bool u_pitch_with_map;uniform highp float u_pitch;uniform bool u_rotate_symbol;uniform highp float u_aspect_ratio;uniform highp float u_camera_to_center_distance;uniform float u_fade_change;uniform vec2 u_texsize;varying vec2 v_data0;varying vec3 v_data1;\n#pragma mapbox: define highp vec4 fill_color\n#pragma mapbox: define highp vec4 halo_color\n#pragma mapbox: define lowp float opacity\n#pragma mapbox: define lowp float halo_width\n#pragma mapbox: define lowp float halo_blur\nvoid main() {\n#pragma mapbox: initialize highp vec4 fill_color\n#pragma mapbox: initialize highp vec4 halo_color\n#pragma mapbox: initialize lowp float opacity\n#pragma mapbox: initialize lowp float halo_width\n#pragma mapbox: initialize lowp float halo_blur\nvec2 a_pos=a_pos_offset.xy;vec2 a_offset=a_pos_offset.zw;vec2 a_tex=a_data.xy;vec2 a_size=a_data.zw;highp float segment_angle=-a_projected_pos[2];float size;if (!u_is_size_zoom_constant && !u_is_size_feature_constant) {size=mix(a_size[0],a_size[1],u_size_t)/256.0;} else if (u_is_size_zoom_constant && !u_is_size_feature_constant) {size=a_size[0]/256.0;} else if (!u_is_size_zoom_constant && u_is_size_feature_constant) {size=u_size;} else {size=u_size;}vec4 projectedPoint=u_matrix*vec4(a_pos,0,1);highp float camera_to_anchor_distance=projectedPoint.w;highp float distance_ratio=u_pitch_with_map ?\ncamera_to_anchor_distance/u_camera_to_center_distance :\nu_camera_to_center_distance/camera_to_anchor_distance;highp float perspective_ratio=clamp(0.5+0.5*distance_ratio,0.0,4.0);size*=perspective_ratio;float fontScale=u_is_text ? size/24.0 : size;highp float symbol_rotation=0.0;if (u_rotate_symbol) {vec4 offsetProjectedPoint=u_matrix*vec4(a_pos+vec2(1,0),0,1);vec2 a=projectedPoint.xy/projectedPoint.w;vec2 b=offsetProjectedPoint.xy/offsetProjectedPoint.w;symbol_rotation=atan((b.y-a.y)/u_aspect_ratio,b.x-a.x);}highp float angle_sin=sin(segment_angle+symbol_rotation);highp float angle_cos=cos(segment_angle+symbol_rotation);mat2 rotation_matrix=mat2(angle_cos,-1.0*angle_sin,angle_sin,angle_cos);vec4 projected_pos=u_label_plane_matrix*vec4(a_projected_pos.xy,0.0,1.0);gl_Position=u_coord_matrix*vec4(projected_pos.xy/projected_pos.w+rotation_matrix*(a_offset/32.0*fontScale),0.0,1.0);float gamma_scale=gl_Position.w;vec2 tex=a_tex/u_texsize;vec2 fade_opacity=unpack_opacity(a_fade_opacity);float fade_change=fade_opacity[1] > 0.5 ? u_fade_change :-u_fade_change;float interpolated_fade_opacity=max(0.0,min(1.0,fade_opacity[0]+fade_change));v_data0=vec2(tex.x,tex.y);v_data1=vec3(gamma_scale,size,interpolated_fade_opacity);}");function hi(t,e){var i=/#pragma mapbox: ([\w]+) ([\w]+) ([\w]+) ([\w]+)/g,o={};return {fragmentSource:t=t.replace(i,(function(t,e,i,r,a){return o[a]=!0,"define"===e?"\n#ifndef HAS_UNIFORM_u_"+a+"\nvarying "+i+" "+r+" "+a+";\n#else\nuniform "+i+" "+r+" u_"+a+";\n#endif\n":"\n#ifdef HAS_UNIFORM_u_"+a+"\n    "+i+" "+r+" "+a+" = u_"+a+";\n#endif\n"})),vertexSource:e=e.replace(i,(function(t,e,i,r,a){var n="float"===r?"vec2":"vec4",s=a.match(/color/)?"color":n;return o[a]?"define"===e?"\n#ifndef HAS_UNIFORM_u_"+a+"\nuniform lowp float u_"+a+"_t;\nattribute "+i+" "+n+" a_"+a+";\nvarying "+i+" "+r+" "+a+";\n#else\nuniform "+i+" "+r+" u_"+a+";\n#endif\n":"vec4"===s?"\n#ifndef HAS_UNIFORM_u_"+a+"\n    "+a+" = a_"+a+";\n#else\n    "+i+" "+r+" "+a+" = u_"+a+";\n#endif\n":"\n#ifndef HAS_UNIFORM_u_"+a+"\n    "+a+" = unpack_mix_"+s+"(a_"+a+", u_"+a+"_t);\n#else\n    "+i+" "+r+" "+a+" = u_"+a+";\n#endif\n":"define"===e?"\n#ifndef HAS_UNIFORM_u_"+a+"\nuniform lowp float u_"+a+"_t;\nattribute "+i+" "+n+" a_"+a+";\n#else\nuniform "+i+" "+r+" u_"+a+";\n#endif\n":"vec4"===s?"\n#ifndef HAS_UNIFORM_u_"+a+"\n    "+i+" "+r+" "+a+" = a_"+a+";\n#else\n    "+i+" "+r+" "+a+" = u_"+a+";\n#endif\n":"\n#ifndef HAS_UNIFORM_u_"+a+"\n    "+i+" "+r+" "+a+" = unpack_mix_"+s+"(a_"+a+", u_"+a+"_t);\n#else\n    "+i+" "+r+" "+a+" = u_"+a+";\n#endif\n"}))}}var pi=Object.freeze({prelude:Ne,background:Ze,backgroundPattern:Ve,circle:qe,clippingMask:je,heatmap:Ge,heatmapTexture:We,collisionBox:Xe,collisionCircle:He,debug:Ke,fill:Je,fillOutline:Ye,fillOutlinePattern:Qe,fillPattern:$e,fillExtrusion:ti,fillExtrusionPattern:ei,hillshadePrepare:ii,hillshade:oi,line:ri,lineGradient:ai,linePattern:ni,lineSDF:si,raster:li,symbolIcon:ci,symbolSDF:ui}),di=function(){this.boundProgram=null,this.boundLayoutVertexBuffer=null,this.boundPaintVertexBuffers=[],this.boundIndexBuffer=null,this.boundVertexOffset=null,this.boundDynamicVertexBuffer=null,this.vao=null;};di.prototype.bind=function(t,e,i,o,r,a,n,s){this.context=t;for(var l=this.boundPaintVertexBuffers.length!==o.length,c=0;!l&&c<o.length;c++)this.boundPaintVertexBuffers[c]!==o[c]&&(l=!0);var u=!this.vao||this.boundProgram!==e||this.boundLayoutVertexBuffer!==i||l||this.boundIndexBuffer!==r||this.boundVertexOffset!==a||this.boundDynamicVertexBuffer!==n||this.boundDynamicVertexBuffer2!==s;!t.extVertexArrayObject||u?this.freshBind(e,i,o,r,a,n,s):(t.bindVertexArrayOES.set(this.vao),n&&n.bind(),r&&r.dynamicDraw&&r.bind(),s&&s.bind());},di.prototype.freshBind=function(t,e,i,o,r,a,n){var s,l=t.numAttributes,c=this.context,u=c.gl;if(c.extVertexArrayObject)this.vao&&this.destroy(),this.vao=c.extVertexArrayObject.createVertexArrayOES(),c.bindVertexArrayOES.set(this.vao),s=0,this.boundProgram=t,this.boundLayoutVertexBuffer=e,this.boundPaintVertexBuffers=i,this.boundIndexBuffer=o,this.boundVertexOffset=r,this.boundDynamicVertexBuffer=a,this.boundDynamicVertexBuffer2=n;else{s=c.currentNumAttributes||0;for(var h=l;h<s;h++)u.disableVertexAttribArray(h);}e.enableAttributes(u,t);for(var p=0,d=i;p<d.length;p+=1){d[p].enableAttributes(u,t);}a&&a.enableAttributes(u,t),n&&n.enableAttributes(u,t),e.bind(),e.setVertexAttribPointers(u,t,r);for(var _=0,f=i;_<f.length;_+=1){var m=f[_];m.bind(),m.setVertexAttribPointers(u,t,r);}a&&(a.bind(),a.setVertexAttribPointers(u,t,r)),o&&o.bind(),n&&(n.bind(),n.setVertexAttribPointers(u,t,r)),c.currentNumAttributes=l;},di.prototype.destroy=function(){this.vao&&(this.context.extVertexArrayObject.deleteVertexArrayOES(this.vao),this.vao=null);};var _i=function(t,e,i,o,r){var a=t.gl;this.program=a.createProgram();var n=i.defines();r&&n.push("#define OVERDRAW_INSPECTOR;");var s=n.concat(Ne.fragmentSource,e.fragmentSource).join("\n"),l=n.concat(Ne.vertexSource,e.vertexSource).join("\n"),c=a.createShader(a.FRAGMENT_SHADER);a.shaderSource(c,s),a.compileShader(c),a.attachShader(this.program,c);var u=a.createShader(a.VERTEX_SHADER);a.shaderSource(u,l),a.compileShader(u),a.attachShader(this.program,u);for(var h=i.layoutAttributes||[],p=0;p<h.length;p++)a.bindAttribLocation(this.program,p,h[p].name);a.linkProgram(this.program),this.numAttributes=a.getProgramParameter(this.program,a.ACTIVE_ATTRIBUTES),this.attributes={};for(var d={},_=0;_<this.numAttributes;_++){var f=a.getActiveAttrib(this.program,_);f&&(this.attributes[f.name]=a.getAttribLocation(this.program,f.name));}for(var m=a.getProgramParameter(this.program,a.ACTIVE_UNIFORMS),g=0;g<m;g++){var v=a.getActiveUniform(this.program,g);v&&(d[v.name]=a.getUniformLocation(this.program,v.name));}this.fixedUniforms=o(t,d),this.binderUniforms=i.getUniforms(t,d);};function fi(e,i,o){var r=1/ue(o,1,i.transform.tileZoom),a=Math.pow(2,o.tileID.overscaledZ),n=o.tileSize*Math.pow(2,i.transform.tileZoom)/a,s=n*(o.tileID.canonical.x+o.tileID.wrap*a),l=n*o.tileID.canonical.y;return {u_image:0,u_texsize:o.imageAtlasTexture.size,u_scale:[t.browser.devicePixelRatio,r,e.fromScale,e.toScale],u_fade:e.t,u_pixel_coord_upper:[s>>16,l>>16],u_pixel_coord_lower:[65535&s,65535&l]}}_i.prototype.draw=function(t,e,i,o,r,a,n,s,l,c,u,h,p,d,_,f){var m,g=t.gl;for(var v in t.program.set(this.program),t.setDepthMode(i),t.setStencilMode(o),t.setColorMode(r),t.setCullFace(a),this.fixedUniforms)this.fixedUniforms[v].set(n[v]);d&&d.setUniforms(t,this.binderUniforms,h,{zoom:p});for(var y=(m={},m[g.LINES]=2,m[g.TRIANGLES]=3,m[g.LINE_STRIP]=1,m)[e],x=0,b=u.get();x<b.length;x+=1){var w=b[x],E=w.vaos||(w.vaos={});(E[s]||(E[s]=new di)).bind(t,this,l,d?d.getPaintVertexBuffers():[],c,w.vertexOffset,_,f),g.drawElements(e,w.primitiveLength*y,g.UNSIGNED_SHORT,w.primitiveOffset*y*2);}};var mi=function(e,i,o,r){var a=i.style.light,n=a.properties.get("position"),s=[n.x,n.y,n.z],l=t.create$1();"viewport"===a.properties.get("anchor")&&t.fromRotation(l,-i.transform.angle),t.transformMat3(s,s,l);var c=a.properties.get("color");return {u_matrix:e,u_lightpos:s,u_lightintensity:a.properties.get("intensity"),u_lightcolor:[c.r,c.g,c.b],u_vertical_gradient:+o,u_opacity:r}},gi=function(e,i,o,r,a,n,s){return t.extend(mi(e,i,o,r),fi(n,i,s),{u_height_factor:-Math.pow(2,a.overscaledZ)/s.tileSize/8})},vi=function(t){return {u_matrix:t}},yi=function(e,i,o,r){return t.extend(vi(e),fi(o,i,r))},xi=function(t,e){return {u_matrix:t,u_world:e}},bi=function(e,i,o,r,a){return t.extend(yi(e,i,o,r),{u_world:a})},wi=function(e,i,o,r){var a,n,s=e.transform;if("map"===r.paint.get("circle-pitch-alignment")){var l=ue(o,1,s.zoom);a=!0,n=[l,l];}else a=!1,n=s.pixelsToGLUnits;return {u_camera_to_center_distance:s.cameraToCenterDistance,u_scale_with_map:+("map"===r.paint.get("circle-pitch-scale")),u_matrix:e.translatePosMatrix(i.posMatrix,o,r.paint.get("circle-translate"),r.paint.get("circle-translate-anchor")),u_pitch_with_map:+a,u_device_pixel_ratio:t.browser.devicePixelRatio,u_extrude_scale:n}},Ei=function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_camera_to_center_distance:new t.Uniform1f(e,i.u_camera_to_center_distance),u_pixels_to_tile_units:new t.Uniform1f(e,i.u_pixels_to_tile_units),u_extrude_scale:new t.Uniform2f(e,i.u_extrude_scale),u_overscale_factor:new t.Uniform1f(e,i.u_overscale_factor)}},Ti=function(t,e,i){var o=ue(i,1,e.zoom),r=Math.pow(2,e.zoom-i.tileID.overscaledZ),a=i.tileID.overscaleFactor();return {u_matrix:t,u_camera_to_center_distance:e.cameraToCenterDistance,u_pixels_to_tile_units:o,u_extrude_scale:[e.pixelsToGLUnits[0]/(o*r),e.pixelsToGLUnits[1]/(o*r)],u_overscale_factor:a}},Ii=function(t,e){return {u_matrix:t,u_color:e}},Ci=function(t){return {u_matrix:t}},Si=function(t,e,i,o){return {u_matrix:t,u_extrude_scale:ue(e,1,i),u_intensity:o}},Pi=function(e,i,o,r){var a=t.create();t.ortho(a,0,e.width,e.height,0,0,1);var n=e.context.gl;return {u_matrix:a,u_world:[n.drawingBufferWidth,n.drawingBufferHeight],u_image:o,u_color_ramp:r,u_opacity:i.paint.get("heatmap-opacity")}},zi=function(t,e,i){var o=i.paint.get("hillshade-shadow-color"),r=i.paint.get("hillshade-highlight-color"),a=i.paint.get("hillshade-accent-color"),n=i.paint.get("hillshade-illumination-direction")*(Math.PI/180);"viewport"===i.paint.get("hillshade-illumination-anchor")&&(n-=t.transform.angle);var s=!t.options.moving;return {u_matrix:t.transform.calculatePosMatrix(e.tileID.toUnwrapped(),s),u_image:0,u_latrange:Di(t,e.tileID),u_light:[i.paint.get("hillshade-exaggeration"),n],u_shadow:o,u_highlight:r,u_accent:a}},Li=function(e,i,o){var r=i.stride,a=t.create();return t.ortho(a,0,t.EXTENT,-t.EXTENT,0,0,1),t.translate(a,a,[0,-t.EXTENT,0]),{u_matrix:a,u_image:1,u_dimension:[r,r],u_zoom:e.overscaledZ,u_maxzoom:o,u_unpack:i.getUnpackVector()}};function Di(e,i){var o=Math.pow(2,i.canonical.z),r=i.canonical.y;return [new t.MercatorCoordinate(0,r/o).toLngLat().lat,new t.MercatorCoordinate(0,(r+1)/o).toLngLat().lat]}var Mi=function(e,i,o){var r=e.transform;return {u_matrix:Oi(e,i,o),u_ratio:1/ue(i,1,r.zoom),u_device_pixel_ratio:t.browser.devicePixelRatio,u_units_to_pixels:[1/r.pixelsToGLUnits[0],1/r.pixelsToGLUnits[1]]}},Ri=function(e,i,o){return t.extend(Mi(e,i,o),{u_image:0})},Ai=function(e,i,o,r){var a=e.transform,n=Bi(i,a);return {u_matrix:Oi(e,i,o),u_texsize:i.imageAtlasTexture.size,u_ratio:1/ue(i,1,a.zoom),u_device_pixel_ratio:t.browser.devicePixelRatio,u_image:0,u_scale:[t.browser.devicePixelRatio,n,r.fromScale,r.toScale],u_fade:r.t,u_units_to_pixels:[1/a.pixelsToGLUnits[0],1/a.pixelsToGLUnits[1]]}},ki=function(e,i,o,r,a){var n=e.transform,s=e.lineAtlas,l=Bi(i,n),c="round"===o.layout.get("line-cap"),u=s.getDash(r.from,c),h=s.getDash(r.to,c),p=u.width*a.fromScale,d=h.width*a.toScale;return t.extend(Mi(e,i,o),{u_patternscale_a:[l/p,-u.height/2],u_patternscale_b:[l/d,-h.height/2],u_sdfgamma:s.width/(256*Math.min(p,d)*t.browser.devicePixelRatio)/2,u_image:0,u_tex_y_a:u.y,u_tex_y_b:h.y,u_mix:a.t})};function Bi(t,e){return 1/ue(t,1,e.tileZoom)}function Oi(t,e,i){return t.translatePosMatrix(e.tileID.posMatrix,e,i.paint.get("line-translate"),i.paint.get("line-translate-anchor"))}var Fi=function(t,e,i,o,r){return {u_matrix:t,u_tl_parent:e,u_scale_parent:i,u_buffer_scale:1,u_fade_t:o.mix,u_opacity:o.opacity*r.paint.get("raster-opacity"),u_image0:0,u_image1:1,u_brightness_low:r.paint.get("raster-brightness-min"),u_brightness_high:r.paint.get("raster-brightness-max"),u_saturation_factor:(n=r.paint.get("raster-saturation"),n>0?1-1/(1.001-n):-n),u_contrast_factor:(a=r.paint.get("raster-contrast"),a>0?1/(1-a):1+a),u_spin_weights:Ui(r.paint.get("raster-hue-rotate"))};var a,n;};function Ui(t){t*=Math.PI/180;var e=Math.sin(t),i=Math.cos(t);return [(2*i+1)/3,(-Math.sqrt(3)*e-i+1)/3,(Math.sqrt(3)*e-i+1)/3]}var Ni=function(t,e,i,o,r,a,n,s,l,c){var u=r.transform;return {u_is_size_zoom_constant:+("constant"===t||"source"===t),u_is_size_feature_constant:+("constant"===t||"camera"===t),u_size_t:e?e.uSizeT:0,u_size:e?e.uSize:0,u_camera_to_center_distance:u.cameraToCenterDistance,u_pitch:u.pitch/360*2*Math.PI,u_rotate_symbol:+i,u_aspect_ratio:u.width/u.height,u_fade_change:r.options.fadeDuration?r.symbolFadeChange:1,u_matrix:a,u_label_plane_matrix:n,u_coord_matrix:s,u_is_text:+l,u_pitch_with_map:+o,u_texsize:c,u_texture:0}},Zi=function(e,i,o,r,a,n,s,l,c,u,h){var p=a.transform;return t.extend(Ni(e,i,o,r,a,n,s,l,c,u),{u_gamma_scale:r?Math.cos(p._pitch)*p.cameraToCenterDistance:1,u_device_pixel_ratio:t.browser.devicePixelRatio,u_is_halo:+h})},Vi=function(t,e,i){return {u_matrix:t,u_opacity:e,u_color:i}},qi=function(e,i,o,r,a,n){return t.extend(function(t,e,i,o){var r=i.imageManager.getPattern(t.from.toString()),a=i.imageManager.getPattern(t.to.toString()),n=i.imageManager.getPixelSize(),s=n.width,l=n.height,c=Math.pow(2,o.tileID.overscaledZ),u=o.tileSize*Math.pow(2,i.transform.tileZoom)/c,h=u*(o.tileID.canonical.x+o.tileID.wrap*c),p=u*o.tileID.canonical.y;return {u_image:0,u_pattern_tl_a:r.tl,u_pattern_br_a:r.br,u_pattern_tl_b:a.tl,u_pattern_br_b:a.br,u_texsize:[s,l],u_mix:e.t,u_pattern_size_a:r.displaySize,u_pattern_size_b:a.displaySize,u_scale_a:e.fromScale,u_scale_b:e.toScale,u_tile_units_to_pixels:1/ue(o,1,i.transform.tileZoom),u_pixel_coord_upper:[h>>16,p>>16],u_pixel_coord_lower:[65535&h,65535&p]}}(r,n,o,a),{u_matrix:e,u_opacity:i})},ji={fillExtrusion:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_lightpos:new t.Uniform3f(e,i.u_lightpos),u_lightintensity:new t.Uniform1f(e,i.u_lightintensity),u_lightcolor:new t.Uniform3f(e,i.u_lightcolor),u_vertical_gradient:new t.Uniform1f(e,i.u_vertical_gradient),u_opacity:new t.Uniform1f(e,i.u_opacity)}},fillExtrusionPattern:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_lightpos:new t.Uniform3f(e,i.u_lightpos),u_lightintensity:new t.Uniform1f(e,i.u_lightintensity),u_lightcolor:new t.Uniform3f(e,i.u_lightcolor),u_vertical_gradient:new t.Uniform1f(e,i.u_vertical_gradient),u_height_factor:new t.Uniform1f(e,i.u_height_factor),u_image:new t.Uniform1i(e,i.u_image),u_texsize:new t.Uniform2f(e,i.u_texsize),u_pixel_coord_upper:new t.Uniform2f(e,i.u_pixel_coord_upper),u_pixel_coord_lower:new t.Uniform2f(e,i.u_pixel_coord_lower),u_scale:new t.Uniform4f(e,i.u_scale),u_fade:new t.Uniform1f(e,i.u_fade),u_opacity:new t.Uniform1f(e,i.u_opacity)}},fill:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix)}},fillPattern:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_image:new t.Uniform1i(e,i.u_image),u_texsize:new t.Uniform2f(e,i.u_texsize),u_pixel_coord_upper:new t.Uniform2f(e,i.u_pixel_coord_upper),u_pixel_coord_lower:new t.Uniform2f(e,i.u_pixel_coord_lower),u_scale:new t.Uniform4f(e,i.u_scale),u_fade:new t.Uniform1f(e,i.u_fade)}},fillOutline:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_world:new t.Uniform2f(e,i.u_world)}},fillOutlinePattern:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_world:new t.Uniform2f(e,i.u_world),u_image:new t.Uniform1i(e,i.u_image),u_texsize:new t.Uniform2f(e,i.u_texsize),u_pixel_coord_upper:new t.Uniform2f(e,i.u_pixel_coord_upper),u_pixel_coord_lower:new t.Uniform2f(e,i.u_pixel_coord_lower),u_scale:new t.Uniform4f(e,i.u_scale),u_fade:new t.Uniform1f(e,i.u_fade)}},circle:function(e,i){return {u_camera_to_center_distance:new t.Uniform1f(e,i.u_camera_to_center_distance),u_scale_with_map:new t.Uniform1i(e,i.u_scale_with_map),u_pitch_with_map:new t.Uniform1i(e,i.u_pitch_with_map),u_extrude_scale:new t.Uniform2f(e,i.u_extrude_scale),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_matrix:new t.UniformMatrix4f(e,i.u_matrix)}},collisionBox:Ei,collisionCircle:Ei,debug:function(e,i){return {u_color:new t.UniformColor(e,i.u_color),u_matrix:new t.UniformMatrix4f(e,i.u_matrix)}},clippingMask:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix)}},heatmap:function(e,i){return {u_extrude_scale:new t.Uniform1f(e,i.u_extrude_scale),u_intensity:new t.Uniform1f(e,i.u_intensity),u_matrix:new t.UniformMatrix4f(e,i.u_matrix)}},heatmapTexture:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_world:new t.Uniform2f(e,i.u_world),u_image:new t.Uniform1i(e,i.u_image),u_color_ramp:new t.Uniform1i(e,i.u_color_ramp),u_opacity:new t.Uniform1f(e,i.u_opacity)}},hillshade:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_image:new t.Uniform1i(e,i.u_image),u_latrange:new t.Uniform2f(e,i.u_latrange),u_light:new t.Uniform2f(e,i.u_light),u_shadow:new t.UniformColor(e,i.u_shadow),u_highlight:new t.UniformColor(e,i.u_highlight),u_accent:new t.UniformColor(e,i.u_accent)}},hillshadePrepare:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_image:new t.Uniform1i(e,i.u_image),u_dimension:new t.Uniform2f(e,i.u_dimension),u_zoom:new t.Uniform1f(e,i.u_zoom),u_maxzoom:new t.Uniform1f(e,i.u_maxzoom),u_unpack:new t.Uniform4f(e,i.u_unpack)}},line:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_ratio:new t.Uniform1f(e,i.u_ratio),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_units_to_pixels:new t.Uniform2f(e,i.u_units_to_pixels)}},lineGradient:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_ratio:new t.Uniform1f(e,i.u_ratio),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_units_to_pixels:new t.Uniform2f(e,i.u_units_to_pixels),u_image:new t.Uniform1i(e,i.u_image)}},linePattern:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_texsize:new t.Uniform2f(e,i.u_texsize),u_ratio:new t.Uniform1f(e,i.u_ratio),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_image:new t.Uniform1i(e,i.u_image),u_units_to_pixels:new t.Uniform2f(e,i.u_units_to_pixels),u_scale:new t.Uniform4f(e,i.u_scale),u_fade:new t.Uniform1f(e,i.u_fade)}},lineSDF:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_ratio:new t.Uniform1f(e,i.u_ratio),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_units_to_pixels:new t.Uniform2f(e,i.u_units_to_pixels),u_patternscale_a:new t.Uniform2f(e,i.u_patternscale_a),u_patternscale_b:new t.Uniform2f(e,i.u_patternscale_b),u_sdfgamma:new t.Uniform1f(e,i.u_sdfgamma),u_image:new t.Uniform1i(e,i.u_image),u_tex_y_a:new t.Uniform1f(e,i.u_tex_y_a),u_tex_y_b:new t.Uniform1f(e,i.u_tex_y_b),u_mix:new t.Uniform1f(e,i.u_mix)}},raster:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_tl_parent:new t.Uniform2f(e,i.u_tl_parent),u_scale_parent:new t.Uniform1f(e,i.u_scale_parent),u_buffer_scale:new t.Uniform1f(e,i.u_buffer_scale),u_fade_t:new t.Uniform1f(e,i.u_fade_t),u_opacity:new t.Uniform1f(e,i.u_opacity),u_image0:new t.Uniform1i(e,i.u_image0),u_image1:new t.Uniform1i(e,i.u_image1),u_brightness_low:new t.Uniform1f(e,i.u_brightness_low),u_brightness_high:new t.Uniform1f(e,i.u_brightness_high),u_saturation_factor:new t.Uniform1f(e,i.u_saturation_factor),u_contrast_factor:new t.Uniform1f(e,i.u_contrast_factor),u_spin_weights:new t.Uniform3f(e,i.u_spin_weights)}},symbolIcon:function(e,i){return {u_is_size_zoom_constant:new t.Uniform1i(e,i.u_is_size_zoom_constant),u_is_size_feature_constant:new t.Uniform1i(e,i.u_is_size_feature_constant),u_size_t:new t.Uniform1f(e,i.u_size_t),u_size:new t.Uniform1f(e,i.u_size),u_camera_to_center_distance:new t.Uniform1f(e,i.u_camera_to_center_distance),u_pitch:new t.Uniform1f(e,i.u_pitch),u_rotate_symbol:new t.Uniform1i(e,i.u_rotate_symbol),u_aspect_ratio:new t.Uniform1f(e,i.u_aspect_ratio),u_fade_change:new t.Uniform1f(e,i.u_fade_change),u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_label_plane_matrix:new t.UniformMatrix4f(e,i.u_label_plane_matrix),u_coord_matrix:new t.UniformMatrix4f(e,i.u_coord_matrix),u_is_text:new t.Uniform1f(e,i.u_is_text),u_pitch_with_map:new t.Uniform1i(e,i.u_pitch_with_map),u_texsize:new t.Uniform2f(e,i.u_texsize),u_texture:new t.Uniform1i(e,i.u_texture)}},symbolSDF:function(e,i){return {u_is_size_zoom_constant:new t.Uniform1i(e,i.u_is_size_zoom_constant),u_is_size_feature_constant:new t.Uniform1i(e,i.u_is_size_feature_constant),u_size_t:new t.Uniform1f(e,i.u_size_t),u_size:new t.Uniform1f(e,i.u_size),u_camera_to_center_distance:new t.Uniform1f(e,i.u_camera_to_center_distance),u_pitch:new t.Uniform1f(e,i.u_pitch),u_rotate_symbol:new t.Uniform1i(e,i.u_rotate_symbol),u_aspect_ratio:new t.Uniform1f(e,i.u_aspect_ratio),u_fade_change:new t.Uniform1f(e,i.u_fade_change),u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_label_plane_matrix:new t.UniformMatrix4f(e,i.u_label_plane_matrix),u_coord_matrix:new t.UniformMatrix4f(e,i.u_coord_matrix),u_is_text:new t.Uniform1f(e,i.u_is_text),u_pitch_with_map:new t.Uniform1i(e,i.u_pitch_with_map),u_texsize:new t.Uniform2f(e,i.u_texsize),u_texture:new t.Uniform1i(e,i.u_texture),u_gamma_scale:new t.Uniform1f(e,i.u_gamma_scale),u_device_pixel_ratio:new t.Uniform1f(e,i.u_device_pixel_ratio),u_is_halo:new t.Uniform1f(e,i.u_is_halo)}},background:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_opacity:new t.Uniform1f(e,i.u_opacity),u_color:new t.UniformColor(e,i.u_color)}},backgroundPattern:function(e,i){return {u_matrix:new t.UniformMatrix4f(e,i.u_matrix),u_opacity:new t.Uniform1f(e,i.u_opacity),u_image:new t.Uniform1i(e,i.u_image),u_pattern_tl_a:new t.Uniform2f(e,i.u_pattern_tl_a),u_pattern_br_a:new t.Uniform2f(e,i.u_pattern_br_a),u_pattern_tl_b:new t.Uniform2f(e,i.u_pattern_tl_b),u_pattern_br_b:new t.Uniform2f(e,i.u_pattern_br_b),u_texsize:new t.Uniform2f(e,i.u_texsize),u_mix:new t.Uniform1f(e,i.u_mix),u_pattern_size_a:new t.Uniform2f(e,i.u_pattern_size_a),u_pattern_size_b:new t.Uniform2f(e,i.u_pattern_size_b),u_scale_a:new t.Uniform1f(e,i.u_scale_a),u_scale_b:new t.Uniform1f(e,i.u_scale_b),u_pixel_coord_upper:new t.Uniform2f(e,i.u_pixel_coord_upper),u_pixel_coord_lower:new t.Uniform2f(e,i.u_pixel_coord_lower),u_tile_units_to_pixels:new t.Uniform1f(e,i.u_tile_units_to_pixels)}}};function Gi(e,i){for(var o=e.sort((function(t,e){return t.tileID.isLessThan(e.tileID)?-1:e.tileID.isLessThan(t.tileID)?1:0})),r=0;r<o.length;r++){var a={},n=o[r],s=o.slice(r+1);Wi(n.tileID.wrapped(),n.tileID,s,new t.OverscaledTileID(0,n.tileID.wrap+1,0,0,0),a),n.setMask(a,i);}}function Wi(e,i,o,r,a){for(var n=0;n<o.length;n++){var s=o[n];if(r.isLessThan(s.tileID))break;if(i.key===s.tileID.key)return;if(s.tileID.isChildOf(i)){for(var l=i.children(1/0),c=0;c<l.length;c++){Wi(e,l[c],o.slice(n),r,a);}return}}var u=i.overscaledZ-e.overscaledZ,h=new t.CanonicalTileID(u,i.canonical.x-(e.canonical.x<<u),i.canonical.y-(e.canonical.y<<u));a[h.key]=a[h.key]||h;}function Xi(t,e,i,o,r,a,n,s){for(var l=t.context,c=l.gl,u=r?t.useProgram("collisionCircle"):t.useProgram("collisionBox"),h=0;h<o.length;h++){var p=o[h],d=e.getTile(p),_=d.getBucket(i);if(_){var f=r?s?_.textCollisionCircle:_.iconCollisionCircle:s?_.textCollisionBox:_.iconCollisionBox;if(f){var m=p.posMatrix;0===a[0]&&0===a[1]||(m=t.translatePosMatrix(p.posMatrix,d,a,n)),u.draw(l,r?c.TRIANGLES:c.LINES,It.disabled,Ct.disabled,t.colorModeForRenderPass(),Pt.disabled,Ti(m,t.transform,d),i.id,f.layoutVertexBuffer,f.indexBuffer,f.segments,null,t.transform.zoom,null,null,f.collisionVertexBuffer);}}}}function Hi(t,e,i,o,r,a,n){Xi(t,e,i,o,!1,r,a,n),Xi(t,e,i,o,!0,r,a,n);}var Ki=t.identity(new Float32Array(16));function Ji(e,i,o,r,a,n){var s=t.getAnchorAlignment(e),l=-(s.horizontalAlign-.5)*i,c=-(s.verticalAlign-.5)*o,u=t.evaluateVariableOffset(e,r);return new t.Point((l/a+u[0])*n,(c/a+u[1])*n)}function Yi(e,i,o,r,a,n,s,l,c,u,h){var p=e.text.placedSymbolArray,d=e.text.dynamicLayoutVertexArray,_=e.icon.dynamicLayoutVertexArray,f={};d.clear();for(var m=0;m<p.length;m++){var g=p.get(m),v=e.allowVerticalPlacement&&!g.placedOrientation,y=g.hidden||!g.crossTileID||v?null:r[g.crossTileID];if(y){var x=new t.Point(g.anchorX,g.anchorY),b=Yt(x,o?l:s),w=.5+n.cameraToCenterDistance/b.signedDistanceFromCamera*.5,E=a.evaluateSizeForFeature(e.textSizeData,u,g)*w/t.ONE_EM;o&&(E*=e.tilePixelRatio/c);for(var T=y.width,I=y.height,C=Ji(y.anchor,T,I,y.textOffset,y.textBoxScale,E),S=o?Yt(x.add(C),s).point:b.point.add(i?C.rotate(-n.angle):C),P=e.allowVerticalPlacement&&g.placedOrientation===t.WritingMode.vertical?Math.PI/2:0,z=0;z<g.numGlyphs;z++)t.addDynamicAttributes(d,S,P);h&&g.associatedIconIndex>=0&&(f[g.associatedIconIndex]={shiftedAnchor:S,angle:P});}else ne(g.numGlyphs,d);}if(h){_.clear();for(var L=e.icon.placedSymbolArray,D=0;D<L.length;D++){var M=L.get(D);if(M.hidden)ne(M.numGlyphs,_);else{var R=f[D];if(R)for(var A=0;A<M.numGlyphs;A++)t.addDynamicAttributes(_,R.shiftedAnchor,R.angle);else ne(M.numGlyphs,_);}}e.icon.dynamicLayoutVertexBuffer.updateData(_);}e.text.dynamicLayoutVertexBuffer.updateData(d);}function Qi(e){var i=e.text.placedSymbolArray,o=e.text.dynamicLayoutVertexArray;o.clear();for(var r=0;r<i.length;r++){var a=i.get(r);if(a.hidden||!a.placedOrientation)ne(a.numGlyphs,o);else for(var n=new t.Point(a.anchorX,a.anchorY),s=e.allowVerticalPlacement&&a.placedOrientation===t.WritingMode.vertical?Math.PI/2:0,l=0;l<a.numGlyphs;l++)t.addDynamicAttributes(o,n,s);}e.text.dynamicLayoutVertexBuffer.updateData(o);}function $i(e,i,o,r,a,n,s,l,c,u,h,p){for(var d,_,f=e.context,m=f.gl,g=e.transform,v="map"===l,y="map"===c,x=v&&"point"!==o.layout.get("symbol-placement"),b=v&&!y&&!x,w=void 0!==o.layout.get("symbol-sort-key").constantOr(1),E=e.depthModeForSublayer(0,It.ReadOnly),T=o.layout.get("text-variable-anchor"),I=[],C=0,S=r;C<S.length;C+=1){var P=S[C],z=i.getTile(P),L=z.getBucket(o);if(L){var D=a?L.text:L.icon;if(D&&D.segments.get().length){var M=D.programConfigurations.get(o.id),R=a||L.sdfIcons,A=a?L.textSizeData:L.iconSizeData;d||(d=e.useProgram(R?"symbolSDF":"symbolIcon",M),_=t.evaluateSizeForZoom(A,g.zoom)),f.activeTexture.set(m.TEXTURE0);var k=void 0,B=void 0,O=void 0;if(a)B=z.glyphAtlasTexture,O=m.LINEAR,k=z.glyphAtlasTexture.size;else{var F=1!==o.layout.get("icon-size").constantOr(0)||L.iconsNeedLinear,U=y||0!==g.pitch;B=z.imageAtlasTexture,O=R||e.options.rotating||e.options.zooming||F||U?m.LINEAR:m.NEAREST,k=z.imageAtlasTexture.size;}var N=ue(z,1,e.transform.zoom),Z=Kt(P.posMatrix,y,v,e.transform,N),V=Jt(P.posMatrix,y,v,e.transform,N),q=T&&L.hasTextData(),j="none"!==o.layout.get("icon-text-fit")&&q&&L.hasIconData();x?$t(L,P.posMatrix,e,a,Z,V,y,u):a&&_&&L.allowVerticalPlacement&&!T&&Qi(L);var G=e.translatePosMatrix(P.posMatrix,z,n,s),W=x||a&&T||j?Ki:Z,X=e.translatePosMatrix(V,z,n,s,!0),H=R&&0!==o.paint.get(a?"text-halo-width":"icon-halo-width").constantOr(1),K={program:d,buffers:D,uniformValues:R?Zi(A.kind,_,b,y,e,G,W,X,a,k,!0):Ni(A.kind,_,b,y,e,G,W,X,a,k),atlasTexture:B,atlasInterpolation:O,isSDF:R,hasHalo:H};if(w)for(var J=0,Y=D.segments.get();J<Y.length;J+=1){var Q=Y[J];I.push({segments:new t.SegmentVector([Q]),sortKey:Q.sortKey,state:K});}else I.push({segments:D.segments,sortKey:0,state:K});}}}w&&I.sort((function(t,e){return t.sortKey-e.sortKey}));for(var $=0,tt=I;$<tt.length;$+=1){var et=tt[$],it=et.state;if(it.atlasTexture.bind(it.atlasInterpolation,m.CLAMP_TO_EDGE),it.isSDF){var ot=it.uniformValues;it.hasHalo&&(ot.u_is_halo=1,to(it.buffers,et.segments,o,e,it.program,E,h,p,ot)),ot.u_is_halo=0;}to(it.buffers,et.segments,o,e,it.program,E,h,p,it.uniformValues);}}function to(t,e,i,o,r,a,n,s,l){var c=o.context,u=c.gl;r.draw(c,u.TRIANGLES,a,n,s,Pt.disabled,l,i.id,t.layoutVertexBuffer,t.indexBuffer,e,i.paint,o.transform.zoom,t.programConfigurations.get(i.id),t.dynamicLayoutVertexBuffer,t.opacityVertexBuffer);}function eo(t,e,i,o,r,a,n){var s,l,c,u,h,p=t.context.gl,d=i.paint.get("fill-pattern"),_=d&&d.constantOr(1),f=i.getCrossfadeParameters();n?(l=_&&!i.getPaintProperty("fill-outline-color")?"fillOutlinePattern":"fillOutline",s=p.LINES):(l=_?"fillPattern":"fill",s=p.TRIANGLES);for(var m=0,g=o;m<g.length;m+=1){var v=g[m],y=e.getTile(v);if(!_||y.patternsLoaded()){var x=y.getBucket(i);if(x){var b=x.programConfigurations.get(i.id),w=t.useProgram(l,b);_&&(t.context.activeTexture.set(p.TEXTURE0),y.imageAtlasTexture.bind(p.LINEAR,p.CLAMP_TO_EDGE),b.updatePatternPaintBuffers(f));var E=d.constantOr(null);if(E&&y.imageAtlas){var T=y.imageAtlas,I=T.patternPositions[E.to.toString()],C=T.patternPositions[E.from.toString()];I&&C&&b.setConstantPatternPositions(I,C);}var S=t.translatePosMatrix(v.posMatrix,y,i.paint.get("fill-translate"),i.paint.get("fill-translate-anchor"));if(n){u=x.indexBuffer2,h=x.segments2;var P=[p.drawingBufferWidth,p.drawingBufferHeight];c="fillOutlinePattern"===l&&_?bi(S,t,f,y,P):xi(S,P);}else u=x.indexBuffer,h=x.segments,c=_?yi(S,t,f,y):vi(S);w.draw(t.context,s,r,t.stencilModeForClipping(v),a,Pt.disabled,c,i.id,x.layoutVertexBuffer,u,h,i.paint,t.transform.zoom,b);}}}}function io(t,e,i,o,r,a,n){for(var s=t.context,l=s.gl,c=i.paint.get("fill-extrusion-pattern"),u=c.constantOr(1),h=i.getCrossfadeParameters(),p=i.paint.get("fill-extrusion-opacity"),d=0,_=o;d<_.length;d+=1){var f=_[d],m=e.getTile(f),g=m.getBucket(i);if(g){var v=g.programConfigurations.get(i.id),y=t.useProgram(u?"fillExtrusionPattern":"fillExtrusion",v);u&&(t.context.activeTexture.set(l.TEXTURE0),m.imageAtlasTexture.bind(l.LINEAR,l.CLAMP_TO_EDGE),v.updatePatternPaintBuffers(h));var x=c.constantOr(null);if(x&&m.imageAtlas){var b=m.imageAtlas,w=b.patternPositions[x.to.toString()],E=b.patternPositions[x.from.toString()];w&&E&&v.setConstantPatternPositions(w,E);}var T=t.translatePosMatrix(f.posMatrix,m,i.paint.get("fill-extrusion-translate"),i.paint.get("fill-extrusion-translate-anchor")),I=i.paint.get("fill-extrusion-vertical-gradient"),C=u?gi(T,t,I,p,f,h,m):mi(T,t,I,p);y.draw(s,s.gl.TRIANGLES,r,a,n,Pt.backCCW,C,i.id,g.layoutVertexBuffer,g.indexBuffer,g.segments,i.paint,t.transform.zoom,v);}}}function oo(t,e,i,o,r,a){var n=t.context,s=n.gl,l=e.fbo;if(l){var c=t.useProgram("hillshade");n.activeTexture.set(s.TEXTURE0),s.bindTexture(s.TEXTURE_2D,l.colorAttachment.get());var u=zi(t,e,i);e.maskedBoundsBuffer&&e.maskedIndexBuffer&&e.segments?c.draw(n,s.TRIANGLES,o,r,a,Pt.disabled,u,i.id,e.maskedBoundsBuffer,e.maskedIndexBuffer,e.segments):c.draw(n,s.TRIANGLES,o,r,a,Pt.disabled,u,i.id,t.rasterBoundsBuffer,t.quadTriangleIndexBuffer,t.rasterBoundsSegments);}}function ro(e,i,o,r,a,n,s){var l=e.context,c=l.gl,u=i.dem;if(u&&u.data){var h=u.dim,p=u.stride,d=u.getPixels();if(l.activeTexture.set(c.TEXTURE1),l.pixelStoreUnpackPremultiplyAlpha.set(!1),i.demTexture=i.demTexture||e.getTileTexture(p),i.demTexture){var _=i.demTexture;_.update(d,{premultiply:!1}),_.bind(c.NEAREST,c.CLAMP_TO_EDGE);}else i.demTexture=new t.Texture(l,d,c.RGBA,{premultiply:!1}),i.demTexture.bind(c.NEAREST,c.CLAMP_TO_EDGE);l.activeTexture.set(c.TEXTURE0);var f=i.fbo;if(!f){var m=new t.Texture(l,{width:h,height:h,data:null},c.RGBA);m.bind(c.LINEAR,c.CLAMP_TO_EDGE),(f=i.fbo=l.createFramebuffer(h,h)).colorAttachment.set(m.texture);}l.bindFramebuffer.set(f.framebuffer),l.viewport.set([0,0,h,h]),e.useProgram("hillshadePrepare").draw(l,c.TRIANGLES,a,n,s,Pt.disabled,Li(i.tileID,u,r),o.id,e.rasterBoundsBuffer,e.quadTriangleIndexBuffer,e.rasterBoundsSegments),i.needsHillshadePrepare=!1;}}function ao(e,i,o,r,a){var n=r.paint.get("raster-fade-duration");if(n>0){var s=t.browser.now(),l=(s-e.timeAdded)/n,c=i?(s-i.timeAdded)/n:-1,u=o.getSource(),h=a.coveringZoomLevel({tileSize:u.tileSize,roundZoom:u.roundZoom}),p=!i||Math.abs(i.tileID.overscaledZ-h)>Math.abs(e.tileID.overscaledZ-h),d=p&&e.refreshedUponExpiration?1:t.clamp(p?l:1-c,0,1);return e.refreshedUponExpiration&&l>=1&&(e.refreshedUponExpiration=!1),i?{opacity:1,mix:1-d}:{opacity:d,mix:0}}return {opacity:1,mix:0}}function no(e,i,o){var r=e.context,a=r.gl,n=o.posMatrix,s=e.useProgram("debug"),l=It.disabled,c=Ct.disabled,u=e.colorModeForRenderPass(),h="$debug";s.draw(r,a.LINE_STRIP,l,c,u,Pt.disabled,Ii(n,t.Color.red),h,e.debugBuffer,e.tileBorderIndexBuffer,e.debugSegments);for(var p=i.getTileByID(o.key).latestRawTileData,d=p&&p.byteLength||0,_=Math.floor(d/1024),f=i.getTile(o).tileSize,m=512/Math.min(f,512),g=function(t,e,i,o){o=o||1;var r,a,n,s,l,c,u,h,p=[];for(r=0,a=t.length;r<a;r++)if(l=so[t[r]]){for(h=null,n=0,s=l[1].length;n<s;n+=2)-1===l[1][n]&&-1===l[1][n+1]?h=null:(c=e+l[1][n]*o,u=i-l[1][n+1]*o,h&&p.push(h.x,h.y,c,u),h={x:c,y:u});e+=l[0]*o;}return p}(o.toString()+" "+_+"kb",50,200*m,5*m),v=new t.StructArrayLayout2i4,y=new t.StructArrayLayout2ui4,x=0;x<g.length;x+=2)v.emplaceBack(g[x],g[x+1]),y.emplaceBack(x,x+1);for(var b=r.createVertexBuffer(v,Ue.members),w=r.createIndexBuffer(y),E=t.SegmentVector.simpleSegment(0,0,v.length/2,v.length/2),T=t.EXTENT/(Math.pow(2,e.transform.zoom-o.overscaledZ)*f*m),I=[],C=-1;C<=1;C++)for(var S=-1;S<=1&&(0!==C||0!==S);S++)I.push([C,S]);for(var P=0;P<I.length;P++){var z=I[P];s.draw(r,a.LINES,l,c,u,Pt.disabled,Ii(t.translate([],n,[T*z[0],T*z[1],0]),t.Color.white),h,b,w,E);}s.draw(r,a.LINES,l,c,u,Pt.disabled,Ii(n,t.Color.black),h,b,w,E);}var so={" ":[16,[]],"!":[10,[5,21,5,7,-1,-1,5,2,4,1,5,0,6,1,5,2]],'"':[16,[4,21,4,14,-1,-1,12,21,12,14]],"#":[21,[11,25,4,-7,-1,-1,17,25,10,-7,-1,-1,4,12,18,12,-1,-1,3,6,17,6]],$:[20,[8,25,8,-4,-1,-1,12,25,12,-4,-1,-1,17,18,15,20,12,21,8,21,5,20,3,18,3,16,4,14,5,13,7,12,13,10,15,9,16,8,17,6,17,3,15,1,12,0,8,0,5,1,3,3]],"%":[24,[21,21,3,0,-1,-1,8,21,10,19,10,17,9,15,7,14,5,14,3,16,3,18,4,20,6,21,8,21,10,20,13,19,16,19,19,20,21,21,-1,-1,17,7,15,6,14,4,14,2,16,0,18,0,20,1,21,3,21,5,19,7,17,7]],"&":[26,[23,12,23,13,22,14,21,14,20,13,19,11,17,6,15,3,13,1,11,0,7,0,5,1,4,2,3,4,3,6,4,8,5,9,12,13,13,14,14,16,14,18,13,20,11,21,9,20,8,18,8,16,9,13,11,10,16,3,18,1,20,0,22,0,23,1,23,2]],"'":[10,[5,19,4,20,5,21,6,20,6,18,5,16,4,15]],"(":[14,[11,25,9,23,7,20,5,16,4,11,4,7,5,2,7,-2,9,-5,11,-7]],")":[14,[3,25,5,23,7,20,9,16,10,11,10,7,9,2,7,-2,5,-5,3,-7]],"*":[16,[8,21,8,9,-1,-1,3,18,13,12,-1,-1,13,18,3,12]],"+":[26,[13,18,13,0,-1,-1,4,9,22,9]],",":[10,[6,1,5,0,4,1,5,2,6,1,6,-1,5,-3,4,-4]],"-":[26,[4,9,22,9]],".":[10,[5,2,4,1,5,0,6,1,5,2]],"/":[22,[20,25,2,-7]],0:[20,[9,21,6,20,4,17,3,12,3,9,4,4,6,1,9,0,11,0,14,1,16,4,17,9,17,12,16,17,14,20,11,21,9,21]],1:[20,[6,17,8,18,11,21,11,0]],2:[20,[4,16,4,17,5,19,6,20,8,21,12,21,14,20,15,19,16,17,16,15,15,13,13,10,3,0,17,0]],3:[20,[5,21,16,21,10,13,13,13,15,12,16,11,17,8,17,6,16,3,14,1,11,0,8,0,5,1,4,2,3,4]],4:[20,[13,21,3,7,18,7,-1,-1,13,21,13,0]],5:[20,[15,21,5,21,4,12,5,13,8,14,11,14,14,13,16,11,17,8,17,6,16,3,14,1,11,0,8,0,5,1,4,2,3,4]],6:[20,[16,18,15,20,12,21,10,21,7,20,5,17,4,12,4,7,5,3,7,1,10,0,11,0,14,1,16,3,17,6,17,7,16,10,14,12,11,13,10,13,7,12,5,10,4,7]],7:[20,[17,21,7,0,-1,-1,3,21,17,21]],8:[20,[8,21,5,20,4,18,4,16,5,14,7,13,11,12,14,11,16,9,17,7,17,4,16,2,15,1,12,0,8,0,5,1,4,2,3,4,3,7,4,9,6,11,9,12,13,13,15,14,16,16,16,18,15,20,12,21,8,21]],9:[20,[16,14,15,11,13,9,10,8,9,8,6,9,4,11,3,14,3,15,4,18,6,20,9,21,10,21,13,20,15,18,16,14,16,9,15,4,13,1,10,0,8,0,5,1,4,3]],":":[10,[5,14,4,13,5,12,6,13,5,14,-1,-1,5,2,4,1,5,0,6,1,5,2]],";":[10,[5,14,4,13,5,12,6,13,5,14,-1,-1,6,1,5,0,4,1,5,2,6,1,6,-1,5,-3,4,-4]],"<":[24,[20,18,4,9,20,0]],"=":[26,[4,12,22,12,-1,-1,4,6,22,6]],">":[24,[4,18,20,9,4,0]],"?":[18,[3,16,3,17,4,19,5,20,7,21,11,21,13,20,14,19,15,17,15,15,14,13,13,12,9,10,9,7,-1,-1,9,2,8,1,9,0,10,1,9,2]],"@":[27,[18,13,17,15,15,16,12,16,10,15,9,14,8,11,8,8,9,6,11,5,14,5,16,6,17,8,-1,-1,12,16,10,14,9,11,9,8,10,6,11,5,-1,-1,18,16,17,8,17,6,19,5,21,5,23,7,24,10,24,12,23,15,22,17,20,19,18,20,15,21,12,21,9,20,7,19,5,17,4,15,3,12,3,9,4,6,5,4,7,2,9,1,12,0,15,0,18,1,20,2,21,3,-1,-1,19,16,18,8,18,6,19,5]],A:[18,[9,21,1,0,-1,-1,9,21,17,0,-1,-1,4,7,14,7]],B:[21,[4,21,4,0,-1,-1,4,21,13,21,16,20,17,19,18,17,18,15,17,13,16,12,13,11,-1,-1,4,11,13,11,16,10,17,9,18,7,18,4,17,2,16,1,13,0,4,0]],C:[21,[18,16,17,18,15,20,13,21,9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5]],D:[21,[4,21,4,0,-1,-1,4,21,11,21,14,20,16,18,17,16,18,13,18,8,17,5,16,3,14,1,11,0,4,0]],E:[19,[4,21,4,0,-1,-1,4,21,17,21,-1,-1,4,11,12,11,-1,-1,4,0,17,0]],F:[18,[4,21,4,0,-1,-1,4,21,17,21,-1,-1,4,11,12,11]],G:[21,[18,16,17,18,15,20,13,21,9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,18,8,-1,-1,13,8,18,8]],H:[22,[4,21,4,0,-1,-1,18,21,18,0,-1,-1,4,11,18,11]],I:[8,[4,21,4,0]],J:[16,[12,21,12,5,11,2,10,1,8,0,6,0,4,1,3,2,2,5,2,7]],K:[21,[4,21,4,0,-1,-1,18,21,4,7,-1,-1,9,12,18,0]],L:[17,[4,21,4,0,-1,-1,4,0,16,0]],M:[24,[4,21,4,0,-1,-1,4,21,12,0,-1,-1,20,21,12,0,-1,-1,20,21,20,0]],N:[22,[4,21,4,0,-1,-1,4,21,18,0,-1,-1,18,21,18,0]],O:[22,[9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21]],P:[21,[4,21,4,0,-1,-1,4,21,13,21,16,20,17,19,18,17,18,14,17,12,16,11,13,10,4,10]],Q:[22,[9,21,7,20,5,18,4,16,3,13,3,8,4,5,5,3,7,1,9,0,13,0,15,1,17,3,18,5,19,8,19,13,18,16,17,18,15,20,13,21,9,21,-1,-1,12,4,18,-2]],R:[21,[4,21,4,0,-1,-1,4,21,13,21,16,20,17,19,18,17,18,15,17,13,16,12,13,11,4,11,-1,-1,11,11,18,0]],S:[20,[17,18,15,20,12,21,8,21,5,20,3,18,3,16,4,14,5,13,7,12,13,10,15,9,16,8,17,6,17,3,15,1,12,0,8,0,5,1,3,3]],T:[16,[8,21,8,0,-1,-1,1,21,15,21]],U:[22,[4,21,4,6,5,3,7,1,10,0,12,0,15,1,17,3,18,6,18,21]],V:[18,[1,21,9,0,-1,-1,17,21,9,0]],W:[24,[2,21,7,0,-1,-1,12,21,7,0,-1,-1,12,21,17,0,-1,-1,22,21,17,0]],X:[20,[3,21,17,0,-1,-1,17,21,3,0]],Y:[18,[1,21,9,11,9,0,-1,-1,17,21,9,11]],Z:[20,[17,21,3,0,-1,-1,3,21,17,21,-1,-1,3,0,17,0]],"[":[14,[4,25,4,-7,-1,-1,5,25,5,-7,-1,-1,4,25,11,25,-1,-1,4,-7,11,-7]],"\\":[14,[0,21,14,-3]],"]":[14,[9,25,9,-7,-1,-1,10,25,10,-7,-1,-1,3,25,10,25,-1,-1,3,-7,10,-7]],"^":[16,[6,15,8,18,10,15,-1,-1,3,12,8,17,13,12,-1,-1,8,17,8,0]],_:[16,[0,-2,16,-2]],"`":[10,[6,21,5,20,4,18,4,16,5,15,6,16,5,17]],a:[19,[15,14,15,0,-1,-1,15,11,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],b:[19,[4,21,4,0,-1,-1,4,11,6,13,8,14,11,14,13,13,15,11,16,8,16,6,15,3,13,1,11,0,8,0,6,1,4,3]],c:[18,[15,11,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],d:[19,[15,21,15,0,-1,-1,15,11,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],e:[18,[3,8,15,8,15,10,14,12,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],f:[12,[10,21,8,21,6,20,5,17,5,0,-1,-1,2,14,9,14]],g:[19,[15,14,15,-2,14,-5,13,-6,11,-7,8,-7,6,-6,-1,-1,15,11,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],h:[19,[4,21,4,0,-1,-1,4,10,7,13,9,14,12,14,14,13,15,10,15,0]],i:[8,[3,21,4,20,5,21,4,22,3,21,-1,-1,4,14,4,0]],j:[10,[5,21,6,20,7,21,6,22,5,21,-1,-1,6,14,6,-3,5,-6,3,-7,1,-7]],k:[17,[4,21,4,0,-1,-1,14,14,4,4,-1,-1,8,8,15,0]],l:[8,[4,21,4,0]],m:[30,[4,14,4,0,-1,-1,4,10,7,13,9,14,12,14,14,13,15,10,15,0,-1,-1,15,10,18,13,20,14,23,14,25,13,26,10,26,0]],n:[19,[4,14,4,0,-1,-1,4,10,7,13,9,14,12,14,14,13,15,10,15,0]],o:[19,[8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3,16,6,16,8,15,11,13,13,11,14,8,14]],p:[19,[4,14,4,-7,-1,-1,4,11,6,13,8,14,11,14,13,13,15,11,16,8,16,6,15,3,13,1,11,0,8,0,6,1,4,3]],q:[19,[15,14,15,-7,-1,-1,15,11,13,13,11,14,8,14,6,13,4,11,3,8,3,6,4,3,6,1,8,0,11,0,13,1,15,3]],r:[13,[4,14,4,0,-1,-1,4,8,5,11,7,13,9,14,12,14]],s:[17,[14,11,13,13,10,14,7,14,4,13,3,11,4,9,6,8,11,7,13,6,14,4,14,3,13,1,10,0,7,0,4,1,3,3]],t:[12,[5,21,5,4,6,1,8,0,10,0,-1,-1,2,14,9,14]],u:[19,[4,14,4,4,5,1,7,0,10,0,12,1,15,4,-1,-1,15,14,15,0]],v:[16,[2,14,8,0,-1,-1,14,14,8,0]],w:[22,[3,14,7,0,-1,-1,11,14,7,0,-1,-1,11,14,15,0,-1,-1,19,14,15,0]],x:[17,[3,14,14,0,-1,-1,14,14,3,0]],y:[16,[2,14,8,0,-1,-1,14,14,8,0,6,-4,4,-6,2,-7,1,-7]],z:[17,[14,14,3,0,-1,-1,3,14,14,14,-1,-1,3,0,14,0]],"{":[14,[9,25,7,24,6,23,5,21,5,19,6,17,7,16,8,14,8,12,6,10,-1,-1,7,24,6,22,6,20,7,18,8,17,9,15,9,13,8,11,4,9,8,7,9,5,9,3,8,1,7,0,6,-2,6,-4,7,-6,-1,-1,6,8,8,6,8,4,7,2,6,1,5,-1,5,-3,6,-5,7,-6,9,-7]],"|":[8,[4,25,4,-7]],"}":[14,[5,25,7,24,8,23,9,21,9,19,8,17,7,16,6,14,6,12,8,10,-1,-1,7,24,8,22,8,20,7,18,6,17,5,15,5,13,6,11,10,9,6,7,5,5,5,3,6,1,7,0,8,-2,8,-4,7,-6,-1,-1,8,8,6,6,6,4,7,2,8,1,9,-1,9,-3,8,-5,7,-6,5,-7]],"~":[24,[3,6,3,8,4,11,6,12,8,12,10,11,14,8,16,7,18,7,20,8,21,10,-1,-1,3,8,4,10,6,11,8,11,10,10,14,7,16,6,18,6,20,7,21,10,21,12]]};var lo={symbol:function(e,i,o,r,a){if("translucent"===e.renderPass){var n=Ct.disabled,s=e.colorModeForRenderPass();o.layout.get("text-variable-anchor")&&function(e,i,o,r,a,n,s){for(var l=i.transform,c="map"===a,u="map"===n,h=0,p=e;h<p.length;h+=1){var d=p[h],_=r.getTile(d),f=_.getBucket(o);if(f&&f.text&&f.text.segments.get().length){var m=f.textSizeData,g=t.evaluateSizeForZoom(m,l.zoom),v=ue(_,1,i.transform.zoom),y=Kt(d.posMatrix,u,c,i.transform,v),x="none"!==o.layout.get("icon-text-fit")&&f.hasIconData();if(g){var b=Math.pow(2,l.zoom-_.tileID.overscaledZ);Yi(f,c,u,s,t.symbolSize,l,y,d.posMatrix,b,g,x);}}}}(r,e,o,i,o.layout.get("text-rotation-alignment"),o.layout.get("text-pitch-alignment"),a),0!==o.paint.get("icon-opacity").constantOr(1)&&$i(e,i,o,r,!1,o.paint.get("icon-translate"),o.paint.get("icon-translate-anchor"),o.layout.get("icon-rotation-alignment"),o.layout.get("icon-pitch-alignment"),o.layout.get("icon-keep-upright"),n,s),0!==o.paint.get("text-opacity").constantOr(1)&&$i(e,i,o,r,!0,o.paint.get("text-translate"),o.paint.get("text-translate-anchor"),o.layout.get("text-rotation-alignment"),o.layout.get("text-pitch-alignment"),o.layout.get("text-keep-upright"),n,s),i.map.showCollisionBoxes&&(Hi(e,i,o,r,o.paint.get("text-translate"),o.paint.get("text-translate-anchor"),!0),Hi(e,i,o,r,o.paint.get("icon-translate"),o.paint.get("icon-translate-anchor"),!1));}},circle:function(e,i,o,r){if("translucent"===e.renderPass){var a=o.paint.get("circle-opacity"),n=o.paint.get("circle-stroke-width"),s=o.paint.get("circle-stroke-opacity"),l=void 0!==o.layout.get("circle-sort-key").constantOr(1);if(0!==a.constantOr(1)||0!==n.constantOr(1)&&0!==s.constantOr(1)){for(var c=e.context,u=c.gl,h=e.depthModeForSublayer(0,It.ReadOnly),p=Ct.disabled,d=e.colorModeForRenderPass(),_=[],f=0;f<r.length;f++){var m=r[f],g=i.getTile(m),v=g.getBucket(o);if(v){var y=v.programConfigurations.get(o.id),x={programConfiguration:y,program:e.useProgram("circle",y),layoutVertexBuffer:v.layoutVertexBuffer,indexBuffer:v.indexBuffer,uniformValues:wi(e,m,g,o)};if(l)for(var b=0,w=v.segments.get();b<w.length;b+=1){var E=w[b];_.push({segments:new t.SegmentVector([E]),sortKey:E.sortKey,state:x});}else _.push({segments:v.segments,sortKey:0,state:x});}}l&&_.sort((function(t,e){return t.sortKey-e.sortKey}));for(var T=0,I=_;T<I.length;T+=1){var C=I[T],S=C.state,P=S.programConfiguration,z=S.program,L=S.layoutVertexBuffer,D=S.indexBuffer,M=S.uniformValues,R=C.segments;z.draw(c,u.TRIANGLES,h,p,d,Pt.disabled,M,o.id,L,D,R,o.paint,e.transform.zoom,P);}}}},heatmap:function(e,i,o,r){if(0!==o.paint.get("heatmap-opacity"))if("offscreen"===e.renderPass){var a=e.context,n=a.gl,s=e.depthModeForSublayer(0,It.ReadOnly),l=Ct.disabled,c=new St([n.ONE,n.ONE],t.Color.transparent,[!0,!0,!0,!0]);!function(t,e,i){var o=t.gl;t.activeTexture.set(o.TEXTURE1),t.viewport.set([0,0,e.width/4,e.height/4]);var r=i.heatmapFbo;if(r)o.bindTexture(o.TEXTURE_2D,r.colorAttachment.get()),t.bindFramebuffer.set(r.framebuffer);else{var a=o.createTexture();o.bindTexture(o.TEXTURE_2D,a),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),r=i.heatmapFbo=t.createFramebuffer(e.width/4,e.height/4),function t(e,i,o,r){var a=e.gl;a.texImage2D(a.TEXTURE_2D,0,a.RGBA,i.width/4,i.height/4,0,a.RGBA,e.extTextureHalfFloat?e.extTextureHalfFloat.HALF_FLOAT_OES:a.UNSIGNED_BYTE,null);r.colorAttachment.set(o);e.extTextureHalfFloat&&a.checkFramebufferStatus(a.FRAMEBUFFER)!==a.FRAMEBUFFER_COMPLETE&&(e.extTextureHalfFloat=null,r.colorAttachment.setDirty(),t(e,i,o,r));}(t,e,a,r);}}(a,e,o),a.clear({color:t.Color.transparent});for(var u=0;u<r.length;u++){var h=r[u];if(!i.hasRenderableParent(h)){var p=i.getTile(h),d=p.getBucket(o);if(d){var _=d.programConfigurations.get(o.id),f=e.useProgram("heatmap",_),m=e.transform.zoom;f.draw(a,n.TRIANGLES,s,l,c,Pt.disabled,Si(h.posMatrix,p,m,o.paint.get("heatmap-intensity")),o.id,d.layoutVertexBuffer,d.indexBuffer,d.segments,o.paint,e.transform.zoom,_);}}}a.viewport.set([0,0,e.width,e.height]);}else"translucent"===e.renderPass&&(e.context.setColorMode(e.colorModeForRenderPass()),function(e,i){var o=e.context,r=o.gl,a=i.heatmapFbo;if(!a)return;o.activeTexture.set(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,a.colorAttachment.get()),o.activeTexture.set(r.TEXTURE1);var n=i.colorRampTexture;n||(n=i.colorRampTexture=new t.Texture(o,i.colorRamp,r.RGBA));n.bind(r.LINEAR,r.CLAMP_TO_EDGE),e.useProgram("heatmapTexture").draw(o,r.TRIANGLES,It.disabled,Ct.disabled,e.colorModeForRenderPass(),Pt.disabled,Pi(e,i,0,1),i.id,e.viewportBuffer,e.quadTriangleIndexBuffer,e.viewportSegments,i.paint,e.transform.zoom);}(e,o));},line:function(e,i,o,r){if("translucent"===e.renderPass){var a=o.paint.get("line-opacity"),n=o.paint.get("line-width");if(0!==a.constantOr(1)&&0!==n.constantOr(1)){var s=e.depthModeForSublayer(0,It.ReadOnly),l=e.colorModeForRenderPass(),c=o.paint.get("line-dasharray"),u=o.paint.get("line-pattern"),h=u.constantOr(1),p=o.paint.get("line-gradient"),d=o.getCrossfadeParameters(),_=c?"lineSDF":h?"linePattern":p?"lineGradient":"line",f=e.context,m=f.gl,g=!0;if(p){f.activeTexture.set(m.TEXTURE0);var v=o.gradientTexture;if(!o.gradient)return;v||(v=o.gradientTexture=new t.Texture(f,o.gradient,m.RGBA)),v.bind(m.LINEAR,m.CLAMP_TO_EDGE);}for(var y=0,x=r;y<x.length;y+=1){var b=x[y],w=i.getTile(b);if(!h||w.patternsLoaded()){var E=w.getBucket(o);if(E){var T=E.programConfigurations.get(o.id),I=e.context.program.get(),C=e.useProgram(_,T),S=g||C.program!==I,P=u.constantOr(null);if(P&&w.imageAtlas){var z=w.imageAtlas,L=z.patternPositions[P.to.toString()],D=z.patternPositions[P.from.toString()];L&&D&&T.setConstantPatternPositions(L,D);}var M=c?ki(e,w,o,c,d):h?Ai(e,w,o,d):p?Ri(e,w,o):Mi(e,w,o);c&&(S||e.lineAtlas.dirty)?(f.activeTexture.set(m.TEXTURE0),e.lineAtlas.bind(f)):h&&(f.activeTexture.set(m.TEXTURE0),w.imageAtlasTexture.bind(m.LINEAR,m.CLAMP_TO_EDGE),T.updatePatternPaintBuffers(d)),C.draw(f,m.TRIANGLES,s,e.stencilModeForClipping(b),l,Pt.disabled,M,o.id,E.layoutVertexBuffer,E.indexBuffer,E.segments,o.paint,e.transform.zoom,T),g=!1;}}}}}},fill:function(e,i,o,r){var a=o.paint.get("fill-color"),n=o.paint.get("fill-opacity");if(0!==n.constantOr(1)){var s=e.colorModeForRenderPass(),l=o.paint.get("fill-pattern"),c=e.opaquePassEnabledForLayer()&&!l.constantOr(1)&&1===a.constantOr(t.Color.transparent).a&&1===n.constantOr(0)?"opaque":"translucent";if(e.renderPass===c){var u=e.depthModeForSublayer(1,"opaque"===e.renderPass?It.ReadWrite:It.ReadOnly);eo(e,i,o,r,u,s,!1);}if("translucent"===e.renderPass&&o.paint.get("fill-antialias")){var h=e.depthModeForSublayer(o.getPaintProperty("fill-outline-color")?2:0,It.ReadOnly);eo(e,i,o,r,h,s,!0);}}},"fill-extrusion":function(t,e,i,o){var r=i.paint.get("fill-extrusion-opacity");if(0!==r&&"translucent"===t.renderPass){var a=new It(t.context.gl.LEQUAL,It.ReadWrite,t.depthRangeFor3D);if(1!==r||i.paint.get("fill-extrusion-pattern").constantOr(1))io(t,e,i,o,a,Ct.disabled,St.disabled),io(t,e,i,o,a,t.stencilModeFor3D(),t.colorModeForRenderPass());else{var n=t.colorModeForRenderPass();io(t,e,i,o,a,Ct.disabled,n);}}},hillshade:function(t,e,i,o){if("offscreen"===t.renderPass||"translucent"===t.renderPass){for(var r=t.context,a=e.getSource().maxzoom,n=t.depthModeForSublayer(0,It.ReadOnly),s=Ct.disabled,l=t.colorModeForRenderPass(),c=0,u=o;c<u.length;c+=1){var h=u[c],p=e.getTile(h);p.needsHillshadePrepare&&"offscreen"===t.renderPass?ro(t,p,i,a,n,s,l):"translucent"===t.renderPass&&oo(t,p,i,n,s,l);}r.viewport.set([0,0,t.width,t.height]);}},raster:function(t,e,i,o){if("translucent"===t.renderPass&&0!==i.paint.get("raster-opacity"))for(var r=t.context,a=r.gl,n=e.getSource(),s=t.useProgram("raster"),l=Ct.disabled,c=t.colorModeForRenderPass(),u=o.length&&o[0].overscaledZ,h=!t.options.moving,p=0,d=o;p<d.length;p+=1){var _=d[p],f=t.depthModeForSublayer(_.overscaledZ-u,1===i.paint.get("raster-opacity")?It.ReadWrite:It.ReadOnly,a.LESS),m=e.getTile(_),g=t.transform.calculatePosMatrix(_.toUnwrapped(),h);m.registerFadeDuration(i.paint.get("raster-fade-duration"));var v=e.findLoadedParent(_,0),y=ao(m,v,e,i,t.transform),x=void 0,b=void 0,w="nearest"===i.paint.get("raster-resampling")?a.NEAREST:a.LINEAR;r.activeTexture.set(a.TEXTURE0),m.texture.bind(w,a.CLAMP_TO_EDGE,a.LINEAR_MIPMAP_NEAREST),r.activeTexture.set(a.TEXTURE1),v?(v.texture.bind(w,a.CLAMP_TO_EDGE,a.LINEAR_MIPMAP_NEAREST),x=Math.pow(2,v.tileID.overscaledZ-m.tileID.overscaledZ),b=[m.tileID.canonical.x*x%1,m.tileID.canonical.y*x%1]):m.texture.bind(w,a.CLAMP_TO_EDGE,a.LINEAR_MIPMAP_NEAREST);var E=Fi(g,b||[0,0],x||1,y,i);n instanceof D?s.draw(r,a.TRIANGLES,f,l,c,Pt.disabled,E,i.id,n.boundsBuffer,t.quadTriangleIndexBuffer,n.boundsSegments):m.maskedBoundsBuffer&&m.maskedIndexBuffer&&m.segments?s.draw(r,a.TRIANGLES,f,l,c,Pt.disabled,E,i.id,m.maskedBoundsBuffer,m.maskedIndexBuffer,m.segments,i.paint,t.transform.zoom):s.draw(r,a.TRIANGLES,f,l,c,Pt.disabled,E,i.id,t.rasterBoundsBuffer,t.quadTriangleIndexBuffer,t.rasterBoundsSegments);}},background:function(t,e,i){var o=i.paint.get("background-color"),r=i.paint.get("background-opacity");if(0!==r){var a=t.context,n=a.gl,s=t.transform,l=s.tileSize,c=i.paint.get("background-pattern");if(!t.isPatternMissing(c)){var u=!c&&1===o.a&&1===r&&t.opaquePassEnabledForLayer()?"opaque":"translucent";if(t.renderPass===u){var h=Ct.disabled,p=t.depthModeForSublayer(0,"opaque"===u?It.ReadWrite:It.ReadOnly),d=t.colorModeForRenderPass(),_=t.useProgram(c?"backgroundPattern":"background"),f=s.coveringTiles({tileSize:l});c&&(a.activeTexture.set(n.TEXTURE0),t.imageManager.bind(t.context));for(var m=i.getCrossfadeParameters(),g=0,v=f;g<v.length;g+=1){var y=v[g],x=t.transform.calculatePosMatrix(y.toUnwrapped()),b=c?qi(x,r,t,c,{tileID:y,tileSize:l},m):Vi(x,r,o);_.draw(a,n.TRIANGLES,p,h,d,Pt.disabled,b,i.id,t.tileExtentBuffer,t.quadTriangleIndexBuffer,t.tileExtentSegments);}}}}},debug:function(t,e,i){for(var o=0;o<i.length;o++)no(t,e,i[o]);},custom:function(t,e,i){var o=t.context,r=i.implementation;if("offscreen"===t.renderPass){var a=r.prerender;a&&(t.setCustomLayerDefaults(),o.setColorMode(t.colorModeForRenderPass()),a.call(r,o.gl,t.transform.customLayerMatrix()),o.setDirty(),t.setBaseState());}else if("translucent"===t.renderPass){t.setCustomLayerDefaults(),o.setColorMode(t.colorModeForRenderPass()),o.setStencilMode(Ct.disabled);var n="3d"===r.renderingMode?new It(t.context.gl.LEQUAL,It.ReadWrite,t.depthRangeFor3D):t.depthModeForSublayer(0,It.ReadOnly);o.setDepthMode(n),r.render(o.gl,t.transform.customLayerMatrix()),o.setDirty(),t.setBaseState(),o.bindFramebuffer.set(null);}}},co=function(e,i){this.context=new zt(e),this.transform=i,this._tileTextures={},this.setup(),this.numSublayers=Lt.maxUnderzooming+Lt.maxOverzooming+1,this.depthEpsilon=1/Math.pow(2,16),this.depthRboNeedsClear=!0,this.emptyProgramConfiguration=new t.ProgramConfiguration,this.crossTileSymbolIndex=new Ae;};function uo(t,e){if(t.y>e.y){var i=t;t=e,e=i;}return {x0:t.x,y0:t.y,x1:e.x,y1:e.y,dx:e.x-t.x,dy:e.y-t.y}}function ho(t,e,i,o,r){var a=Math.max(i,Math.floor(e.y0)),n=Math.min(o,Math.ceil(e.y1));if(t.x0===e.x0&&t.y0===e.y0?t.x0+e.dy/t.dy*t.dx<e.x1:t.x1-e.dy/t.dy*t.dx<e.x0){var s=t;t=e,e=s;}for(var l=t.dx/t.dy,c=e.dx/e.dy,u=t.dx>0,h=e.dx<0,p=a;p<n;p++){var d=l*Math.max(0,Math.min(t.dy,p+u-t.y0))+t.x0,_=c*Math.max(0,Math.min(e.dy,p+h-e.y0))+e.x0;r(Math.floor(_),Math.ceil(d),p);}}function po(t,e,i,o,r,a){var n,s=uo(t,e),l=uo(e,i),c=uo(i,t);s.dy>l.dy&&(n=s,s=l,l=n),s.dy>c.dy&&(n=s,s=c,c=n),l.dy>c.dy&&(n=l,l=c,c=n),s.dy&&ho(c,s,o,r,a),l.dy&&ho(c,l,o,r,a);}co.prototype.resize=function(e,i){var o=this.context.gl;if(this.width=e*t.browser.devicePixelRatio,this.height=i*t.browser.devicePixelRatio,this.context.viewport.set([0,0,this.width,this.height]),this.style)for(var r=0,a=this.style._order;r<a.length;r+=1){var n=a[r];this.style._layers[n].resize();}this.depthRbo&&(o.deleteRenderbuffer(this.depthRbo),this.depthRbo=null);},co.prototype.setup=function(){var e=this.context,i=new t.StructArrayLayout2i4;i.emplaceBack(0,0),i.emplaceBack(t.EXTENT,0),i.emplaceBack(0,t.EXTENT),i.emplaceBack(t.EXTENT,t.EXTENT),this.tileExtentBuffer=e.createVertexBuffer(i,Ue.members),this.tileExtentSegments=t.SegmentVector.simpleSegment(0,0,4,2);var o=new t.StructArrayLayout2i4;o.emplaceBack(0,0),o.emplaceBack(t.EXTENT,0),o.emplaceBack(0,t.EXTENT),o.emplaceBack(t.EXTENT,t.EXTENT),this.debugBuffer=e.createVertexBuffer(o,Ue.members),this.debugSegments=t.SegmentVector.simpleSegment(0,0,4,5);var r=new t.StructArrayLayout4i8;r.emplaceBack(0,0,0,0),r.emplaceBack(t.EXTENT,0,t.EXTENT,0),r.emplaceBack(0,t.EXTENT,0,t.EXTENT),r.emplaceBack(t.EXTENT,t.EXTENT,t.EXTENT,t.EXTENT),this.rasterBoundsBuffer=e.createVertexBuffer(r,t.rasterBoundsAttributes.members),this.rasterBoundsSegments=t.SegmentVector.simpleSegment(0,0,4,2);var a=new t.StructArrayLayout2i4;a.emplaceBack(0,0),a.emplaceBack(1,0),a.emplaceBack(0,1),a.emplaceBack(1,1),this.viewportBuffer=e.createVertexBuffer(a,Ue.members),this.viewportSegments=t.SegmentVector.simpleSegment(0,0,4,2);var n=new t.StructArrayLayout1ui2;n.emplaceBack(0),n.emplaceBack(1),n.emplaceBack(3),n.emplaceBack(2),n.emplaceBack(0),this.tileBorderIndexBuffer=e.createIndexBuffer(n);var s=new t.StructArrayLayout3ui6;s.emplaceBack(0,1,2),s.emplaceBack(2,1,3),this.quadTriangleIndexBuffer=e.createIndexBuffer(s);var l=this.context.gl;this.stencilClearMode=new Ct({func:l.ALWAYS,mask:0},0,255,l.ZERO,l.ZERO,l.ZERO);},co.prototype.clearStencil=function(){var e=this.context,i=e.gl;this.nextStencilID=1,this.currentStencilSource=void 0;var o=t.create();t.ortho(o,0,this.width,this.height,0,0,1),t.scale(o,o,[i.drawingBufferWidth,i.drawingBufferHeight,0]),this.useProgram("clippingMask").draw(e,i.TRIANGLES,It.disabled,this.stencilClearMode,St.disabled,Pt.disabled,Ci(o),"$clipping",this.viewportBuffer,this.quadTriangleIndexBuffer,this.viewportSegments);},co.prototype._renderTileClippingMasks=function(t,e){if(this.currentStencilSource!==t.source&&t.isTileClipped()&&e&&e.length){this.currentStencilSource=t.source;var i=this.context,o=i.gl;this.nextStencilID+e.length>256&&this.clearStencil(),i.setColorMode(St.disabled),i.setDepthMode(It.disabled);var r=this.useProgram("clippingMask");this._tileClippingMaskIDs={};for(var a=0,n=e;a<n.length;a+=1){var s=n[a],l=this._tileClippingMaskIDs[s.key]=this.nextStencilID++;r.draw(i,o.TRIANGLES,It.disabled,new Ct({func:o.ALWAYS,mask:0},l,255,o.KEEP,o.KEEP,o.REPLACE),St.disabled,Pt.disabled,Ci(s.posMatrix),"$clipping",this.tileExtentBuffer,this.quadTriangleIndexBuffer,this.tileExtentSegments);}}},co.prototype.stencilModeFor3D=function(){this.currentStencilSource=void 0,this.nextStencilID+1>256&&this.clearStencil();var t=this.nextStencilID++,e=this.context.gl;return new Ct({func:e.NOTEQUAL,mask:255},t,255,e.KEEP,e.KEEP,e.REPLACE)},co.prototype.stencilModeForClipping=function(t){var e=this.context.gl;return new Ct({func:e.EQUAL,mask:255},this._tileClippingMaskIDs[t.key],0,e.KEEP,e.KEEP,e.REPLACE)},co.prototype.colorModeForRenderPass=function(){var e=this.context.gl;if(this._showOverdrawInspector){return new St([e.CONSTANT_COLOR,e.ONE],new t.Color(1/8,1/8,1/8,0),[!0,!0,!0,!0])}return "opaque"===this.renderPass?St.unblended:St.alphaBlended},co.prototype.depthModeForSublayer=function(t,e,i){if(!this.opaquePassEnabledForLayer())return It.disabled;var o=1-((1+this.currentLayer)*this.numSublayers+t)*this.depthEpsilon;return new It(i||this.context.gl.LEQUAL,e,[o,o])},co.prototype.opaquePassEnabledForLayer=function(){return this.currentLayer<this.opaquePassCutoff},co.prototype.render=function(e,i){this.style=e,this.options=i,this.lineAtlas=e.lineAtlas,this.imageManager=e.imageManager,this.glyphManager=e.glyphManager,this.symbolFadeChange=e.placement.symbolFadeChange(t.browser.now()),this.imageManager.beginFrame();var o=this.style._order,r=this.style.sourceCaches;for(var a in r){var n=r[a];n.used&&n.prepare(this.context);}var s={},l={},c={};for(var u in r){var h=r[u];s[u]=h.getVisibleCoordinates(),l[u]=s[u].slice().reverse(),c[u]=h.getVisibleCoordinates(!0).reverse();}for(var p in r){var d=r[p],_=d.getSource();if("raster"===_.type||"raster-dem"===_.type){for(var f=[],m=0,g=s[p];m<g.length;m+=1){var v=g[m];f.push(d.getTile(v));}Gi(f,this.context);}}this.opaquePassCutoff=1/0;for(var y=0;y<o.length;y++){var x=o[y];if(this.style._layers[x].is3D()){this.opaquePassCutoff=y;break}}this.renderPass="offscreen",this.depthRboNeedsClear=!0;for(var b=0,w=o;b<w.length;b+=1){var E=w[b],T=this.style._layers[E];if(T.hasOffscreenPass()&&!T.isHidden(this.transform.zoom)){var I=l[T.source];("custom"===T.type||I.length)&&this.renderLayer(this,r[T.source],T,I);}}for(this.context.bindFramebuffer.set(null),this.context.clear({color:i.showOverdrawInspector?t.Color.black:t.Color.transparent,depth:1}),this.clearStencil(),this._showOverdrawInspector=i.showOverdrawInspector,this.depthRangeFor3D=[0,1-(e._order.length+2)*this.numSublayers*this.depthEpsilon],this.renderPass="opaque",this.currentLayer=o.length-1;this.currentLayer>=0;this.currentLayer--){var C=this.style._layers[o[this.currentLayer]],S=r[C.source],P=s[C.source];this._renderTileClippingMasks(C,P),this.renderLayer(this,S,C,P);}for(this.renderPass="translucent",this.currentLayer=0;this.currentLayer<o.length;this.currentLayer++){var z=this.style._layers[o[this.currentLayer]],L=r[z.source],D=("symbol"===z.type?c:l)[z.source];this._renderTileClippingMasks(z,s[z.source]),this.renderLayer(this,L,z,D);}if(this.options.showTileBoundaries)for(var M in r){lo.debug(this,r[M],s[M]);break}this.context.setDefault();},co.prototype.setupOffscreenDepthRenderbuffer=function(){var t=this.context;this.depthRbo||(this.depthRbo=t.createRenderbuffer(t.gl.DEPTH_COMPONENT16,this.width,this.height));},co.prototype.renderLayer=function(t,e,i,o){i.isHidden(this.transform.zoom)||("background"===i.type||"custom"===i.type||o.length)&&(this.id=i.id,lo[i.type](t,e,i,o,this.style.placement.variableOffsets));},co.prototype.translatePosMatrix=function(e,i,o,r,a){if(!o[0]&&!o[1])return e;var n=a?"map"===r?this.transform.angle:0:"viewport"===r?-this.transform.angle:0;if(n){var s=Math.sin(n),l=Math.cos(n);o=[o[0]*l-o[1]*s,o[0]*s+o[1]*l];}var c=[a?o[0]:ue(i,o[0],this.transform.zoom),a?o[1]:ue(i,o[1],this.transform.zoom),0],u=new Float32Array(16);return t.translate(u,e,c),u},co.prototype.saveTileTexture=function(t){var e=this._tileTextures[t.size[0]];e?e.push(t):this._tileTextures[t.size[0]]=[t];},co.prototype.getTileTexture=function(t){var e=this._tileTextures[t];return e&&e.length>0?e.pop():null},co.prototype.isPatternMissing=function(t){if(!t)return !1;var e=this.imageManager.getPattern(t.from.toString()),i=this.imageManager.getPattern(t.to.toString());return !e||!i},co.prototype.useProgram=function(t,e){void 0===e&&(e=this.emptyProgramConfiguration),this.cache=this.cache||{};var i=""+t+(e.cacheKey||"")+(this._showOverdrawInspector?"/overdraw":"");return this.cache[i]||(this.cache[i]=new _i(this.context,pi[t],e,ji[t],this._showOverdrawInspector)),this.cache[i]},co.prototype.setCustomLayerDefaults=function(){this.context.unbindVAO(),this.context.cullFace.setDefault(),this.context.activeTexture.setDefault(),this.context.pixelStoreUnpack.setDefault(),this.context.pixelStoreUnpackPremultiplyAlpha.setDefault(),this.context.pixelStoreUnpackFlipY.setDefault();},co.prototype.setBaseState=function(){var t=this.context.gl;this.context.cullFace.set(!1),this.context.viewport.set([0,0,this.width,this.height]),this.context.blendEquation.set(t.FUNC_ADD);};var _o=function(e,i,o){this.tileSize=512,this.maxValidLatitude=85.051129,this._renderWorldCopies=void 0===o||o,this._minZoom=e||0,this._maxZoom=i||22,this.setMaxBounds(),this.width=0,this.height=0,this._center=new t.LngLat(0,0),this.zoom=0,this.angle=0,this._fov=.6435011087932844,this._pitch=0,this._unmodified=!0,this._posMatrixCache={},this._alignedPosMatrixCache={};},fo={minZoom:{configurable:!0},maxZoom:{configurable:!0},renderWorldCopies:{configurable:!0},worldSize:{configurable:!0},centerPoint:{configurable:!0},size:{configurable:!0},bearing:{configurable:!0},pitch:{configurable:!0},fov:{configurable:!0},zoom:{configurable:!0},center:{configurable:!0},unmodified:{configurable:!0},point:{configurable:!0}};_o.prototype.clone=function(){var t=new _o(this._minZoom,this._maxZoom,this._renderWorldCopies);return t.tileSize=this.tileSize,t.latRange=this.latRange,t.width=this.width,t.height=this.height,t._center=this._center,t.zoom=this.zoom,t.angle=this.angle,t._fov=this._fov,t._pitch=this._pitch,t._unmodified=this._unmodified,t._calcMatrices(),t},fo.minZoom.get=function(){return this._minZoom},fo.minZoom.set=function(t){this._minZoom!==t&&(this._minZoom=t,this.zoom=Math.max(this.zoom,t));},fo.maxZoom.get=function(){return this._maxZoom},fo.maxZoom.set=function(t){this._maxZoom!==t&&(this._maxZoom=t,this.zoom=Math.min(this.zoom,t));},fo.renderWorldCopies.get=function(){return this._renderWorldCopies},fo.renderWorldCopies.set=function(t){void 0===t?t=!0:null===t&&(t=!1),this._renderWorldCopies=t;},fo.worldSize.get=function(){return this.tileSize*this.scale},fo.centerPoint.get=function(){return this.size._div(2)},fo.size.get=function(){return new t.Point(this.width,this.height)},fo.bearing.get=function(){return -this.angle/Math.PI*180},fo.bearing.set=function(e){var i=-t.wrap(e,-180,180)*Math.PI/180;this.angle!==i&&(this._unmodified=!1,this.angle=i,this._calcMatrices(),this.rotationMatrix=t.create$2(),t.rotate(this.rotationMatrix,this.rotationMatrix,this.angle));},fo.pitch.get=function(){return this._pitch/Math.PI*180},fo.pitch.set=function(e){var i=t.clamp(e,0,60)/180*Math.PI;this._pitch!==i&&(this._unmodified=!1,this._pitch=i,this._calcMatrices());},fo.fov.get=function(){return this._fov/Math.PI*180},fo.fov.set=function(t){t=Math.max(.01,Math.min(60,t)),this._fov!==t&&(this._unmodified=!1,this._fov=t/180*Math.PI,this._calcMatrices());},fo.zoom.get=function(){return this._zoom},fo.zoom.set=function(t){var e=Math.min(Math.max(t,this.minZoom),this.maxZoom);this._zoom!==e&&(this._unmodified=!1,this._zoom=e,this.scale=this.zoomScale(e),this.tileZoom=Math.floor(e),this.zoomFraction=e-this.tileZoom,this._constrain(),this._calcMatrices());},fo.center.get=function(){return this._center},fo.center.set=function(t){t.lat===this._center.lat&&t.lng===this._center.lng||(this._unmodified=!1,this._center=t,this._constrain(),this._calcMatrices());},_o.prototype.coveringZoomLevel=function(t){return (t.roundZoom?Math.round:Math.floor)(this.zoom+this.scaleZoom(this.tileSize/t.tileSize))},_o.prototype.getVisibleUnwrappedCoordinates=function(e){var i=[new t.UnwrappedTileID(0,e)];if(this._renderWorldCopies)for(var o=this.pointCoordinate(new t.Point(0,0)),r=this.pointCoordinate(new t.Point(this.width,0)),a=this.pointCoordinate(new t.Point(this.width,this.height)),n=this.pointCoordinate(new t.Point(0,this.height)),s=Math.floor(Math.min(o.x,r.x,a.x,n.x)),l=Math.floor(Math.max(o.x,r.x,a.x,n.x)),c=s-1;c<=l+1;c++)0!==c&&i.push(new t.UnwrappedTileID(c,e));return i},_o.prototype.coveringTiles=function(e){var i=this.coveringZoomLevel(e),o=i;if(void 0!==e.minzoom&&i<e.minzoom)return [];void 0!==e.maxzoom&&i>e.maxzoom&&(i=e.maxzoom);var r=t.MercatorCoordinate.fromLngLat(this.center),a=Math.pow(2,i),n=new t.Point(a*r.x-.5,a*r.y-.5);return function(e,i,o,r){void 0===r&&(r=!0);var a=1<<e,n={};function s(i,s,l){var c,u,h,p;if(l>=0&&l<=a)for(c=i;c<s;c++)u=Math.floor(c/a),h=(c%a+a)%a,0!==u&&!0!==r||(p=new t.OverscaledTileID(o,u,e,h,l),n[p.key]=p);}var l=i.map((function(e){return new t.Point(e.x,e.y)._mult(a)}));return po(l[0],l[1],l[2],0,a,s),po(l[2],l[3],l[0],0,a,s),Object.keys(n).map((function(t){return n[t]}))}(i,[this.pointCoordinate(new t.Point(0,0)),this.pointCoordinate(new t.Point(this.width,0)),this.pointCoordinate(new t.Point(this.width,this.height)),this.pointCoordinate(new t.Point(0,this.height))],e.reparseOverscaled?o:i,this._renderWorldCopies).sort((function(t,e){return n.dist(t.canonical)-n.dist(e.canonical)}))},_o.prototype.resize=function(t,e){this.width=t,this.height=e,this.pixelsToGLUnits=[2/t,-2/e],this._constrain(),this._calcMatrices();},fo.unmodified.get=function(){return this._unmodified},_o.prototype.zoomScale=function(t){return Math.pow(2,t)},_o.prototype.scaleZoom=function(t){return Math.log(t)/Math.LN2},_o.prototype.project=function(e){var i=t.clamp(e.lat,-this.maxValidLatitude,this.maxValidLatitude);return new t.Point(t.mercatorXfromLng(e.lng)*this.worldSize,t.mercatorYfromLat(i)*this.worldSize)},_o.prototype.unproject=function(e){return new t.MercatorCoordinate(e.x/this.worldSize,e.y/this.worldSize).toLngLat()},fo.point.get=function(){return this.project(this.center)},_o.prototype.setLocationAtPoint=function(e,i){var o=this.pointCoordinate(i),r=this.pointCoordinate(this.centerPoint),a=this.locationCoordinate(e),n=new t.MercatorCoordinate(a.x-(o.x-r.x),a.y-(o.y-r.y));this.center=this.coordinateLocation(n),this._renderWorldCopies&&(this.center=this.center.wrap());},_o.prototype.locationPoint=function(t){return this.coordinatePoint(this.locationCoordinate(t))},_o.prototype.pointLocation=function(t){return this.coordinateLocation(this.pointCoordinate(t))},_o.prototype.locationCoordinate=function(e){return t.MercatorCoordinate.fromLngLat(e)},_o.prototype.coordinateLocation=function(t){return t.toLngLat()},_o.prototype.pointCoordinate=function(e){var i=[e.x,e.y,0,1],o=[e.x,e.y,1,1];t.transformMat4(i,i,this.pixelMatrixInverse),t.transformMat4(o,o,this.pixelMatrixInverse);var r=i[3],a=o[3],n=i[0]/r,s=o[0]/a,l=i[1]/r,c=o[1]/a,u=i[2]/r,h=o[2]/a,p=u===h?0:(0-u)/(h-u);return new t.MercatorCoordinate(t.number(n,s,p)/this.worldSize,t.number(l,c,p)/this.worldSize)},_o.prototype.coordinatePoint=function(e){var i=[e.x*this.worldSize,e.y*this.worldSize,0,1];return t.transformMat4(i,i,this.pixelMatrix),new t.Point(i[0]/i[3],i[1]/i[3])},_o.prototype.getBounds=function(){return (new t.LngLatBounds).extend(this.pointLocation(new t.Point(0,0))).extend(this.pointLocation(new t.Point(this.width,0))).extend(this.pointLocation(new t.Point(this.width,this.height))).extend(this.pointLocation(new t.Point(0,this.height)))},_o.prototype.getMaxBounds=function(){return this.latRange&&2===this.latRange.length&&this.lngRange&&2===this.lngRange.length?new t.LngLatBounds([this.lngRange[0],this.latRange[0]],[this.lngRange[1],this.latRange[1]]):null},_o.prototype.setMaxBounds=function(t){t?(this.lngRange=[t.getWest(),t.getEast()],this.latRange=[t.getSouth(),t.getNorth()],this._constrain()):(this.lngRange=null,this.latRange=[-this.maxValidLatitude,this.maxValidLatitude]);},_o.prototype.calculatePosMatrix=function(e,i){void 0===i&&(i=!1);var o=e.key,r=i?this._alignedPosMatrixCache:this._posMatrixCache;if(r[o])return r[o];var a=e.canonical,n=this.worldSize/this.zoomScale(a.z),s=a.x+Math.pow(2,a.z)*e.wrap,l=t.identity(new Float64Array(16));return t.translate(l,l,[s*n,a.y*n,0]),t.scale(l,l,[n/t.EXTENT,n/t.EXTENT,1]),t.multiply(l,i?this.alignedProjMatrix:this.projMatrix,l),r[o]=new Float32Array(l),r[o]},_o.prototype.customLayerMatrix=function(){return this.mercatorMatrix.slice()},_o.prototype._constrain=function(){if(this.center&&this.width&&this.height&&!this._constraining){this._constraining=!0;var e,i,o,r,a=-90,n=90,s=-180,l=180,c=this.size,u=this._unmodified;if(this.latRange){var h=this.latRange;a=t.mercatorYfromLat(h[1])*this.worldSize,e=(n=t.mercatorYfromLat(h[0])*this.worldSize)-a<c.y?c.y/(n-a):0;}if(this.lngRange){var p=this.lngRange;s=t.mercatorXfromLng(p[0])*this.worldSize,i=(l=t.mercatorXfromLng(p[1])*this.worldSize)-s<c.x?c.x/(l-s):0;}var d=this.point,_=Math.max(i||0,e||0);if(_)return this.center=this.unproject(new t.Point(i?(l+s)/2:d.x,e?(n+a)/2:d.y)),this.zoom+=this.scaleZoom(_),this._unmodified=u,void(this._constraining=!1);if(this.latRange){var f=d.y,m=c.y/2;f-m<a&&(r=a+m),f+m>n&&(r=n-m);}if(this.lngRange){var g=d.x,v=c.x/2;g-v<s&&(o=s+v),g+v>l&&(o=l-v);}void 0===o&&void 0===r||(this.center=this.unproject(new t.Point(void 0!==o?o:d.x,void 0!==r?r:d.y))),this._unmodified=u,this._constraining=!1;}},_o.prototype._calcMatrices=function(){if(this.height){this.cameraToCenterDistance=.5/Math.tan(this._fov/2)*this.height;var e=this._fov/2,i=Math.PI/2+this._pitch,o=Math.sin(e)*this.cameraToCenterDistance/Math.sin(Math.PI-i-e),r=this.point,a=r.x,n=r.y,s=1.01*(Math.cos(Math.PI/2-this._pitch)*o+this.cameraToCenterDistance),l=this.height/50,c=new Float64Array(16);t.perspective(c,this._fov,this.width/this.height,l,s),t.scale(c,c,[1,-1,1]),t.translate(c,c,[0,0,-this.cameraToCenterDistance]),t.rotateX(c,c,this._pitch),t.rotateZ(c,c,this.angle),t.translate(c,c,[-a,-n,0]),this.mercatorMatrix=t.scale([],c,[this.worldSize,this.worldSize,this.worldSize]),t.scale(c,c,[1,1,t.mercatorZfromAltitude(1,this.center.lat)*this.worldSize,1]),this.projMatrix=c;var u=this.width%2/2,h=this.height%2/2,p=Math.cos(this.angle),d=Math.sin(this.angle),_=a-Math.round(a)+p*u+d*h,f=n-Math.round(n)+p*h+d*u,m=new Float64Array(c);if(t.translate(m,m,[_>.5?_-1:_,f>.5?f-1:f,0]),this.alignedProjMatrix=m,c=t.create(),t.scale(c,c,[this.width/2,-this.height/2,1]),t.translate(c,c,[1,-1,0]),this.labelPlaneMatrix=c,c=t.create(),t.scale(c,c,[1,-1,1]),t.translate(c,c,[-1,-1,0]),t.scale(c,c,[2/this.width,2/this.height,1]),this.glCoordMatrix=c,this.pixelMatrix=t.multiply(new Float64Array(16),this.labelPlaneMatrix,this.projMatrix),!(c=t.invert(new Float64Array(16),this.pixelMatrix)))throw new Error("failed to invert matrix");this.pixelMatrixInverse=c,this._posMatrixCache={},this._alignedPosMatrixCache={};}},_o.prototype.maxPitchScaleFactor=function(){if(!this.pixelMatrixInverse)return 1;var e=this.pointCoordinate(new t.Point(0,0)),i=[e.x*this.worldSize,e.y*this.worldSize,0,1];return t.transformMat4(i,i,this.pixelMatrix)[3]/this.cameraToCenterDistance},_o.prototype.getCameraPoint=function(){var e=this._pitch,i=Math.tan(e)*(this.cameraToCenterDistance||1);return this.centerPoint.add(new t.Point(0,i))},_o.prototype.getCameraQueryGeometry=function(e){var i=this.getCameraPoint();if(1===e.length)return [e[0],i];for(var o=i.x,r=i.y,a=i.x,n=i.y,s=0,l=e;s<l.length;s+=1){var c=l[s];o=Math.min(o,c.x),r=Math.min(r,c.y),a=Math.max(a,c.x),n=Math.max(n,c.y);}return [new t.Point(o,r),new t.Point(a,r),new t.Point(a,n),new t.Point(o,n),new t.Point(o,r)]},Object.defineProperties(_o.prototype,fo);var mo=function(){var e,i,o,r,a;t.bindAll(["_onHashChange","_updateHash"],this),this._updateHash=(e=this._updateHashUnthrottled.bind(this),i=300,o=!1,r=null,a=function(){r=null,o&&(e(),r=setTimeout(a,i),o=!1);},function(){return o=!0,r||a(),r});};mo.prototype.addTo=function(e){return this._map=e,t.window.addEventListener("hashchange",this._onHashChange,!1),this._map.on("moveend",this._updateHash),this},mo.prototype.remove=function(){return t.window.removeEventListener("hashchange",this._onHashChange,!1),this._map.off("moveend",this._updateHash),clearTimeout(this._updateHash()),delete this._map,this},mo.prototype.getHashString=function(t){var e=this._map.getCenter(),i=Math.round(100*this._map.getZoom())/100,o=Math.ceil((i*Math.LN2+Math.log(512/360/.5))/Math.LN10),r=Math.pow(10,o),a=Math.round(e.lng*r)/r,n=Math.round(e.lat*r)/r,s=this._map.getBearing(),l=this._map.getPitch(),c="";return c+=t?"#/"+a+"/"+n+"/"+i:"#"+i+"/"+n+"/"+a,(s||l)&&(c+="/"+Math.round(10*s)/10),l&&(c+="/"+Math.round(l)),c},mo.prototype._onHashChange=function(){var e=t.window.location.hash.replace("#","").split("/");return e.length>=3&&(this._map.jumpTo({center:[+e[2],+e[1]],zoom:+e[0],bearing:+(e[3]||0),pitch:+(e[4]||0)}),!0)},mo.prototype._updateHashUnthrottled=function(){var e=this.getHashString();try{t.window.history.replaceState(t.window.history.state,"",e);}catch(t){}};var go=function(e){function o(o,r,a,n){void 0===n&&(n={});var s=i.mousePos(r.getCanvasContainer(),a),l=r.unproject(s);e.call(this,o,t.extend({point:s,lngLat:l,originalEvent:a},n)),this._defaultPrevented=!1,this.target=r;}e&&(o.__proto__=e),o.prototype=Object.create(e&&e.prototype),o.prototype.constructor=o;var r={defaultPrevented:{configurable:!0}};return o.prototype.preventDefault=function(){this._defaultPrevented=!0;},r.defaultPrevented.get=function(){return this._defaultPrevented},Object.defineProperties(o.prototype,r),o}(t.Event),vo=function(e){function o(o,r,a){var n=i.touchPos(r.getCanvasContainer(),a),s=n.map((function(t){return r.unproject(t)})),l=n.reduce((function(t,e,i,o){return t.add(e.div(o.length))}),new t.Point(0,0)),c=r.unproject(l);e.call(this,o,{points:n,point:l,lngLats:s,lngLat:c,originalEvent:a}),this._defaultPrevented=!1;}e&&(o.__proto__=e),o.prototype=Object.create(e&&e.prototype),o.prototype.constructor=o;var r={defaultPrevented:{configurable:!0}};return o.prototype.preventDefault=function(){this._defaultPrevented=!0;},r.defaultPrevented.get=function(){return this._defaultPrevented},Object.defineProperties(o.prototype,r),o}(t.Event),yo=function(t){function e(e,i,o){t.call(this,e,{originalEvent:o}),this._defaultPrevented=!1;}t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e;var i={defaultPrevented:{configurable:!0}};return e.prototype.preventDefault=function(){this._defaultPrevented=!0;},i.defaultPrevented.get=function(){return this._defaultPrevented},Object.defineProperties(e.prototype,i),e}(t.Event),xo=function(e){this._map=e,this._el=e.getCanvasContainer(),this._delta=0,this._defaultZoomRate=.01,this._wheelZoomRate=1/450,t.bindAll(["_onWheel","_onTimeout","_onScrollFrame","_onScrollFinished"],this);};xo.prototype.setZoomRate=function(t){this._defaultZoomRate=t;},xo.prototype.setWheelZoomRate=function(t){this._wheelZoomRate=t;},xo.prototype.isEnabled=function(){return !!this._enabled},xo.prototype.isActive=function(){return !!this._active},xo.prototype.isZooming=function(){return !!this._zooming},xo.prototype.enable=function(t){this.isEnabled()||(this._enabled=!0,this._aroundCenter=t&&"center"===t.around);},xo.prototype.disable=function(){this.isEnabled()&&(this._enabled=!1);},xo.prototype.onWheel=function(e){if(this.isEnabled()){var i=e.deltaMode===t.window.WheelEvent.DOM_DELTA_LINE?40*e.deltaY:e.deltaY,o=t.browser.now(),r=o-(this._lastWheelEventTime||0);this._lastWheelEventTime=o,0!==i&&i%4.000244140625==0?this._type="wheel":0!==i&&Math.abs(i)<4?this._type="trackpad":r>400?(this._type=null,this._lastValue=i,this._timeout=setTimeout(this._onTimeout,40,e)):this._type||(this._type=Math.abs(r*i)<200?"trackpad":"wheel",this._timeout&&(clearTimeout(this._timeout),this._timeout=null,i+=this._lastValue)),e.shiftKey&&i&&(i/=4),this._type&&(this._lastWheelEvent=e,this._delta-=i,this.isActive()||this._start(e)),e.preventDefault();}},xo.prototype._onTimeout=function(t){this._type="wheel",this._delta-=this._lastValue,this.isActive()||this._start(t);},xo.prototype._start=function(e){if(this._delta){this._frameId&&(this._map._cancelRenderFrame(this._frameId),this._frameId=null),this._active=!0,this.isZooming()||(this._zooming=!0,this._map.fire(new t.Event("movestart",{originalEvent:e})),this._map.fire(new t.Event("zoomstart",{originalEvent:e}))),this._finishTimeout&&clearTimeout(this._finishTimeout);var o=i.mousePos(this._el,e);this._around=t.LngLat.convert(this._aroundCenter?this._map.getCenter():this._map.unproject(o)),this._aroundPoint=this._map.transform.locationPoint(this._around),this._frameId||(this._frameId=this._map._requestRenderFrame(this._onScrollFrame));}},xo.prototype._onScrollFrame=function(){var e=this;if(this._frameId=null,this.isActive()){var i=this._map.transform;if(0!==this._delta){var o="wheel"===this._type&&Math.abs(this._delta)>4.000244140625?this._wheelZoomRate:this._defaultZoomRate,r=2/(1+Math.exp(-Math.abs(this._delta*o)));this._delta<0&&0!==r&&(r=1/r);var a="number"==typeof this._targetZoom?i.zoomScale(this._targetZoom):i.scale;this._targetZoom=Math.min(i.maxZoom,Math.max(i.minZoom,i.scaleZoom(a*r))),"wheel"===this._type&&(this._startZoom=i.zoom,this._easing=this._smoothOutEasing(200)),this._delta=0;}var n="number"==typeof this._targetZoom?this._targetZoom:i.zoom,s=this._startZoom,l=this._easing,c=!1;if("wheel"===this._type&&s&&l){var u=Math.min((t.browser.now()-this._lastWheelEventTime)/200,1),h=l(u);i.zoom=t.number(s,n,h),u<1?this._frameId||(this._frameId=this._map._requestRenderFrame(this._onScrollFrame)):c=!0;}else i.zoom=n,c=!0;i.setLocationAtPoint(this._around,this._aroundPoint),this._map.fire(new t.Event("move",{originalEvent:this._lastWheelEvent})),this._map.fire(new t.Event("zoom",{originalEvent:this._lastWheelEvent})),c&&(this._active=!1,this._finishTimeout=setTimeout((function(){e._zooming=!1,e._map.fire(new t.Event("zoomend",{originalEvent:e._lastWheelEvent})),e._map.fire(new t.Event("moveend",{originalEvent:e._lastWheelEvent})),delete e._targetZoom;}),200));}},xo.prototype._smoothOutEasing=function(e){var i=t.ease;if(this._prevEase){var o=this._prevEase,r=(t.browser.now()-o.start)/o.duration,a=o.easing(r+.01)-o.easing(r),n=.27/Math.sqrt(a*a+1e-4)*.01,s=Math.sqrt(.0729-n*n);i=t.bezier(n,s,.25,1);}return this._prevEase={start:t.browser.now(),duration:e,easing:i},i};var bo=function(e,i){this._map=e,this._el=e.getCanvasContainer(),this._container=e.getContainer(),this._clickTolerance=i.clickTolerance||1,t.bindAll(["_onMouseMove","_onMouseUp","_onKeyDown"],this);};bo.prototype.isEnabled=function(){return !!this._enabled},bo.prototype.isActive=function(){return !!this._active},bo.prototype.enable=function(){this.isEnabled()||(this._enabled=!0);},bo.prototype.disable=function(){this.isEnabled()&&(this._enabled=!1);},bo.prototype.onMouseDown=function(e){this.isEnabled()&&e.shiftKey&&0===e.button&&(t.window.document.addEventListener("mousemove",this._onMouseMove,!1),t.window.document.addEventListener("keydown",this._onKeyDown,!1),t.window.document.addEventListener("mouseup",this._onMouseUp,!1),i.disableDrag(),this._startPos=this._lastPos=i.mousePos(this._el,e),this._active=!0);},bo.prototype._onMouseMove=function(t){var e=i.mousePos(this._el,t);if(!(this._lastPos.equals(e)||!this._box&&e.dist(this._startPos)<this._clickTolerance)){var o=this._startPos;this._lastPos=e,this._box||(this._box=i.create("div","mapboxgl-boxzoom",this._container),this._container.classList.add("mapboxgl-crosshair"),this._fireEvent("boxzoomstart",t));var r=Math.min(o.x,e.x),a=Math.max(o.x,e.x),n=Math.min(o.y,e.y),s=Math.max(o.y,e.y);i.setTransform(this._box,"translate("+r+"px,"+n+"px)"),this._box.style.width=a-r+"px",this._box.style.height=s-n+"px";}},bo.prototype._onMouseUp=function(e){if(0===e.button){var o=this._startPos,r=i.mousePos(this._el,e);this._finish(),i.suppressClick(),o.x===r.x&&o.y===r.y?this._fireEvent("boxzoomcancel",e):this._map.fitScreenCoordinates(o,r,this._map.getBearing(),{linear:!0}).fire(new t.Event("boxzoomend",{originalEvent:e}));}},bo.prototype._onKeyDown=function(t){27===t.keyCode&&(this._finish(),this._fireEvent("boxzoomcancel",t));},bo.prototype._finish=function(){this._active=!1,t.window.document.removeEventListener("mousemove",this._onMouseMove,!1),t.window.document.removeEventListener("keydown",this._onKeyDown,!1),t.window.document.removeEventListener("mouseup",this._onMouseUp,!1),this._container.classList.remove("mapboxgl-crosshair"),this._box&&(i.remove(this._box),this._box=null),i.enableDrag(),delete this._startPos,delete this._lastPos;},bo.prototype._fireEvent=function(e,i){return this._map.fire(new t.Event(e,{originalEvent:i}))};var wo=t.bezier(0,0,.25,1),Eo=function(e,i){this._map=e,this._el=i.element||e.getCanvasContainer(),this._state="disabled",this._button=i.button||"right",this._bearingSnap=i.bearingSnap||0,this._pitchWithRotate=!1!==i.pitchWithRotate,t.bindAll(["onMouseDown","_onMouseMove","_onMouseUp","_onBlur","_onDragFrame"],this);};Eo.prototype.isEnabled=function(){return "disabled"!==this._state},Eo.prototype.isActive=function(){return "active"===this._state},Eo.prototype.enable=function(){this.isEnabled()||(this._state="enabled");},Eo.prototype.disable=function(){if(this.isEnabled())switch(this._state){case"active":this._state="disabled",this._unbind(),this._deactivate(),this._fireEvent("rotateend"),this._pitchWithRotate&&this._fireEvent("pitchend"),this._fireEvent("moveend");break;case"pending":this._state="disabled",this._unbind();break;default:this._state="disabled";}},Eo.prototype.onMouseDown=function(e){if("enabled"===this._state){var o="touchstart"===e.type;if(o)this._startTime=Date.now();else if("right"===this._button){if(this._eventButton=i.mouseButton(e),this._eventButton!==(e.ctrlKey?0:2))return}else{if(e.ctrlKey||0!==i.mouseButton(e))return;this._eventButton=0;}i.disableDrag(),o?(t.window.document.addEventListener("touchmove",this._onMouseMove,{capture:!0}),t.window.document.addEventListener("touchend",this._onMouseUp)):(t.window.document.addEventListener("mousemove",this._onMouseMove,{capture:!0}),t.window.document.addEventListener("mouseup",this._onMouseUp)),t.window.addEventListener("blur",this._onBlur),this._state="pending",this._inertia=[[t.browser.now(),this._map.getBearing()]],this._startPos=this._prevPos=this._lastPos=i.mousePos(this._el,e),this._center=this._map.transform.centerPoint,e.preventDefault();}},Eo.prototype._onMouseMove=function(t){var e=i.mousePos(this._el,t);this._lastPos.equals(e)||(this._lastMoveEvent=t,this._lastPos=e,"pending"===this._state&&(this._state="active",this._fireEvent("rotatestart",t),this._fireEvent("movestart",t),this._pitchWithRotate&&this._fireEvent("pitchstart",t)),this._frameId||(this._frameId=this._map._requestRenderFrame(this._onDragFrame)));},Eo.prototype._onDragFrame=function(){this._frameId=null;var e=this._lastMoveEvent;if(e){var i=this._map.transform,o=this._prevPos,r=this._lastPos,a=.8*(o.x-r.x),n=-.5*(o.y-r.y),s=i.bearing-a,l=i.pitch-n,c=this._inertia,u=c[c.length-1];this._drainInertiaBuffer(),c.push([t.browser.now(),this._map._normalizeBearing(s,u[1])]),i.bearing=s,this._pitchWithRotate&&(this._fireEvent("pitch",e),i.pitch=l),this._fireEvent("rotate",e),this._fireEvent("move",e),delete this._lastMoveEvent,this._prevPos=this._lastPos;}},Eo.prototype._onMouseUp=function(t){if("touchend"===t.type&&this._startPos===this._lastPos&&Date.now()-this._startTime<300&&this._el.click(),i.mouseButton(t)===this._eventButton)switch(this._state){case"active":this._state="enabled",i.suppressClick(),this._unbind(),this._deactivate(),this._inertialRotate(t);break;case"pending":this._state="enabled",this._unbind();}},Eo.prototype._onBlur=function(t){switch(this._state){case"active":this._state="enabled",this._unbind(),this._deactivate(),this._fireEvent("rotateend",t),this._pitchWithRotate&&this._fireEvent("pitchend",t),this._fireEvent("moveend",t);break;case"pending":this._state="enabled",this._unbind();}},Eo.prototype._unbind=function(){t.window.document.removeEventListener("mousemove",this._onMouseMove,{capture:!0}),t.window.document.removeEventListener("mouseup",this._onMouseUp),t.window.document.removeEventListener("touchmove",this._onMouseMove,{capture:!0}),t.window.document.removeEventListener("touchend",this._onMouseUp),t.window.removeEventListener("blur",this._onBlur),i.enableDrag();},Eo.prototype._deactivate=function(){this._frameId&&(this._map._cancelRenderFrame(this._frameId),this._frameId=null),delete this._lastMoveEvent,delete this._startPos,delete this._prevPos,delete this._lastPos;},Eo.prototype._inertialRotate=function(t){var e=this;this._fireEvent("rotateend",t),this._drainInertiaBuffer();var i=this._map,o=i.getBearing(),r=this._inertia,a=function(){Math.abs(o)<e._bearingSnap?i.resetNorth({noMoveStart:!0},{originalEvent:t}):e._fireEvent("moveend",t),e._pitchWithRotate&&e._fireEvent("pitchend",t);};if(r.length<2)a();else{var n=r[0],s=r[r.length-1],l=r[r.length-2],c=i._normalizeBearing(o,l[1]),u=s[1]-n[1],h=u<0?-1:1,p=(s[0]-n[0])/1e3;if(0!==u&&0!==p){var d=Math.abs(u*(.25/p));d>180&&(d=180);var _=d/180;c+=h*d*(_/2),Math.abs(i._normalizeBearing(c,0))<this._bearingSnap&&(c=i._normalizeBearing(0,c)),i.rotateTo(c,{duration:1e3*_,easing:wo,noMoveStart:!0},{originalEvent:t});}else a();}},Eo.prototype._fireEvent=function(e,i){return this._map.fire(new t.Event(e,i?{originalEvent:i}:{}))},Eo.prototype._drainInertiaBuffer=function(){for(var e=this._inertia,i=t.browser.now();e.length>0&&i-e[0][0]>160;)e.shift();};var To=t.bezier(0,0,.3,1),Io=function(e,i){this._map=e,this._el=e.getCanvasContainer(),this._state="disabled",this._clickTolerance=i.clickTolerance||1,t.bindAll(["_onMove","_onMouseUp","_onTouchEnd","_onBlur","_onDragFrame"],this);};Io.prototype.isEnabled=function(){return "disabled"!==this._state},Io.prototype.isActive=function(){return "active"===this._state},Io.prototype.enable=function(){this.isEnabled()||(this._el.classList.add("mapboxgl-touch-drag-pan"),this._state="enabled");},Io.prototype.disable=function(){if(this.isEnabled())switch(this._el.classList.remove("mapboxgl-touch-drag-pan"),this._state){case"active":this._state="disabled",this._unbind(),this._deactivate(),this._fireEvent("dragend"),this._fireEvent("moveend");break;case"pending":this._state="disabled",this._unbind();break;default:this._state="disabled";}},Io.prototype.onMouseDown=function(e){"enabled"===this._state&&(e.ctrlKey||0!==i.mouseButton(e)||(i.addEventListener(t.window.document,"mousemove",this._onMove,{capture:!0}),i.addEventListener(t.window.document,"mouseup",this._onMouseUp),this._start(e)));},Io.prototype.onTouchStart=function(e){this.isEnabled()&&(e.touches&&e.touches.length>1&&("pending"===this._state||"active"===this._state)||(i.addEventListener(t.window.document,"touchmove",this._onMove,{capture:!0,passive:!1}),i.addEventListener(t.window.document,"touchend",this._onTouchEnd),this._start(e)));},Io.prototype._start=function(e){t.window.addEventListener("blur",this._onBlur),this._state="pending",this._startPos=this._mouseDownPos=this._prevPos=this._lastPos=i.mousePos(this._el,e),this._startTouch=this._lastTouch=t.window.TouchEvent&&e instanceof t.window.TouchEvent?i.touchPos(this._el,e):null,this._inertia=[[t.browser.now(),this._startPos]];},Io.prototype._touchesMatch=function(t,e){return !(!t||!e||t.length!==e.length)&&t.every((function(t,i){return e[i]===t}))},Io.prototype._onMove=function(e){e.preventDefault();var o=t.window.TouchEvent&&e instanceof t.window.TouchEvent?i.touchPos(this._el,e):null,r=i.mousePos(this._el,e);(o?this._touchesMatch(this._lastTouch,o):this._lastPos.equals(r))||"pending"===this._state&&r.dist(this._mouseDownPos)<this._clickTolerance||(this._lastMoveEvent=e,this._lastPos=r,this._lastTouch=o,this._drainInertiaBuffer(),this._inertia.push([t.browser.now(),this._lastPos]),"pending"===this._state&&(this._state="active",this._shouldStart=!0),this._frameId||(this._frameId=this._map._requestRenderFrame(this._onDragFrame)));},Io.prototype._onDragFrame=function(){this._frameId=null;var t=this._lastMoveEvent;if(t)if(this._map.touchZoomRotate.isActive())this._abort(t);else if(this._shouldStart&&(this._fireEvent("dragstart",t),this._fireEvent("movestart",t),this._shouldStart=!1),this.isActive()){var e=this._map.transform;e.setLocationAtPoint(e.pointLocation(this._prevPos),this._lastPos),this._fireEvent("drag",t),this._fireEvent("move",t),this._prevPos=this._lastPos,delete this._lastMoveEvent;}},Io.prototype._onMouseUp=function(t){if(0===i.mouseButton(t))switch(this._state){case"active":this._state="enabled",i.suppressClick(),this._unbind(),this._deactivate(),this._inertialPan(t);break;case"pending":this._state="enabled",this._unbind();}},Io.prototype._onTouchEnd=function(t){if(t.touches&&0!==t.touches.length)switch(this._state){case"pending":case"active":break;case"enabled":this.onTouchStart(t);}else switch(this._state){case"active":this._state="enabled",this._unbind(),this._deactivate(),this._inertialPan(t);break;case"pending":this._state="enabled",this._unbind();break;case"enabled":this._unbind();}},Io.prototype._abort=function(e){switch(this._state){case"active":this._state="enabled",this._shouldStart||(this._fireEvent("dragend",e),this._fireEvent("moveend",e)),this._unbind(),this._deactivate(),t.window.TouchEvent&&e instanceof t.window.TouchEvent&&e.touches.length>1&&i.addEventListener(t.window.document,"touchend",this._onTouchEnd);break;case"pending":this._state="enabled",this._unbind();break;case"enabled":this._unbind();}},Io.prototype._onBlur=function(t){this._abort(t);},Io.prototype._unbind=function(){i.removeEventListener(t.window.document,"touchmove",this._onMove,{capture:!0,passive:!1}),i.removeEventListener(t.window.document,"touchend",this._onTouchEnd),i.removeEventListener(t.window.document,"mousemove",this._onMove,{capture:!0}),i.removeEventListener(t.window.document,"mouseup",this._onMouseUp),i.removeEventListener(t.window,"blur",this._onBlur);},Io.prototype._deactivate=function(){this._frameId&&(this._map._cancelRenderFrame(this._frameId),this._frameId=null),delete this._lastMoveEvent,delete this._startPos,delete this._prevPos,delete this._mouseDownPos,delete this._lastPos,delete this._startTouch,delete this._lastTouch,delete this._shouldStart;},Io.prototype._inertialPan=function(t){this._fireEvent("dragend",t),this._drainInertiaBuffer();var e=this._inertia;if(e.length<2)this._fireEvent("moveend",t);else{var i=e[e.length-1],o=e[0],r=i[1].sub(o[1]),a=(i[0]-o[0])/1e3;if(0===a||i[1].equals(o[1]))this._fireEvent("moveend",t);else{var n=r.mult(.3/a),s=n.mag();s>1400&&(s=1400,n._unit()._mult(s));var l=s/750,c=n.mult(-l/2);this._map.panBy(c,{duration:1e3*l,easing:To,noMoveStart:!0},{originalEvent:t});}}},Io.prototype._fireEvent=function(e,i){return this._map.fire(new t.Event(e,i?{originalEvent:i}:{}))},Io.prototype._drainInertiaBuffer=function(){for(var e=this._inertia,i=t.browser.now();e.length>0&&i-e[0][0]>160;)e.shift();};var Co=function(e){this._map=e,this._el=e.getCanvasContainer(),t.bindAll(["_onKeyDown"],this);};function So(t){return t*(2-t)}Co.prototype.isEnabled=function(){return !!this._enabled},Co.prototype.enable=function(){this.isEnabled()||(this._el.addEventListener("keydown",this._onKeyDown,!1),this._enabled=!0);},Co.prototype.disable=function(){this.isEnabled()&&(this._el.removeEventListener("keydown",this._onKeyDown),this._enabled=!1);},Co.prototype._onKeyDown=function(t){if(!(t.altKey||t.ctrlKey||t.metaKey)){var e=0,i=0,o=0,r=0,a=0;switch(t.keyCode){case 61:case 107:case 171:case 187:e=1;break;case 189:case 109:case 173:e=-1;break;case 37:t.shiftKey?i=-1:(t.preventDefault(),r=-1);break;case 39:t.shiftKey?i=1:(t.preventDefault(),r=1);break;case 38:t.shiftKey?o=1:(t.preventDefault(),a=-1);break;case 40:t.shiftKey?o=-1:(a=1,t.preventDefault());break;default:return}var n=this._map,s=n.getZoom(),l={duration:300,delayEndEvents:500,easing:So,zoom:e?Math.round(s)+e*(t.shiftKey?2:1):s,bearing:n.getBearing()+15*i,pitch:n.getPitch()+10*o,offset:[100*-r,100*-a],center:n.getCenter()};n.easeTo(l,{originalEvent:t});}};var Po=function(e){this._map=e,t.bindAll(["_onDblClick","_onZoomEnd"],this);};Po.prototype.isEnabled=function(){return !!this._enabled},Po.prototype.isActive=function(){return !!this._active},Po.prototype.enable=function(){this.isEnabled()||(this._enabled=!0);},Po.prototype.disable=function(){this.isEnabled()&&(this._enabled=!1);},Po.prototype.onTouchStart=function(t){var e=this;if(this.isEnabled()&&!(t.points.length>1))if(this._tapped){var i=t.points[0],o=this._tappedPoint;if(o&&o.dist(i)<=30){t.originalEvent.preventDefault();var r=function(){e._tapped&&e._zoom(t),e._map.off("touchcancel",a),e._resetTapped();},a=function(){e._map.off("touchend",r),e._resetTapped();};this._map.once("touchend",r),this._map.once("touchcancel",a);}else this._resetTapped();}else this._tappedPoint=t.points[0],this._tapped=setTimeout((function(){e._tapped=null,e._tappedPoint=null;}),300);},Po.prototype._resetTapped=function(){clearTimeout(this._tapped),this._tapped=null,this._tappedPoint=null;},Po.prototype.onDblClick=function(t){this.isEnabled()&&(t.originalEvent.preventDefault(),this._zoom(t));},Po.prototype._zoom=function(t){this._active=!0,this._map.on("zoomend",this._onZoomEnd),this._map.zoomTo(this._map.getZoom()+(t.originalEvent.shiftKey?-1:1),{around:t.lngLat},t);},Po.prototype._onZoomEnd=function(){this._active=!1,this._map.off("zoomend",this._onZoomEnd);};var zo=t.bezier(0,0,.15,1),Lo=function(e){this._map=e,this._el=e.getCanvasContainer(),t.bindAll(["_onMove","_onEnd","_onTouchFrame"],this);};Lo.prototype.isEnabled=function(){return !!this._enabled},Lo.prototype.enable=function(t){this.isEnabled()||(this._el.classList.add("mapboxgl-touch-zoom-rotate"),this._enabled=!0,this._aroundCenter=!!t&&"center"===t.around);},Lo.prototype.disable=function(){this.isEnabled()&&(this._el.classList.remove("mapboxgl-touch-zoom-rotate"),this._enabled=!1);},Lo.prototype.disableRotation=function(){this._rotationDisabled=!0;},Lo.prototype.enableRotation=function(){this._rotationDisabled=!1;},Lo.prototype.isActive=function(){return this.isEnabled()&&!!this._gestureIntent},Lo.prototype.onStart=function(e){if(this.isEnabled()&&2===e.touches.length){var o=i.mousePos(this._el,e.touches[0]),r=i.mousePos(this._el,e.touches[1]),a=o.add(r).div(2);this._startVec=o.sub(r),this._startAround=this._map.transform.pointLocation(a),this._gestureIntent=void 0,this._inertia=[],i.addEventListener(t.window.document,"touchmove",this._onMove,{passive:!1}),i.addEventListener(t.window.document,"touchend",this._onEnd);}},Lo.prototype._getTouchEventData=function(t){var e=i.mousePos(this._el,t.touches[0]),o=i.mousePos(this._el,t.touches[1]),r=e.sub(o);return {vec:r,center:e.add(o).div(2),scale:r.mag()/this._startVec.mag(),bearing:this._rotationDisabled?0:180*r.angleWith(this._startVec)/Math.PI}},Lo.prototype._onMove=function(e){if(2===e.touches.length){var i=this._getTouchEventData(e),o=i.vec,r=i.scale,a=i.bearing;if(!this._gestureIntent){var n=this._rotationDisabled&&1!==r||Math.abs(1-r)>.15;Math.abs(a)>10?this._gestureIntent="rotate":n&&(this._gestureIntent="zoom"),this._gestureIntent&&(this._map.fire(new t.Event(this._gestureIntent+"start",{originalEvent:e})),this._map.fire(new t.Event("movestart",{originalEvent:e})),this._startVec=o);}this._lastTouchEvent=e,this._frameId||(this._frameId=this._map._requestRenderFrame(this._onTouchFrame)),e.preventDefault();}},Lo.prototype._onTouchFrame=function(){this._frameId=null;var e=this._gestureIntent;if(e){var i=this._map.transform;this._startScale||(this._startScale=i.scale,this._startBearing=i.bearing);var o=this._getTouchEventData(this._lastTouchEvent),r=o.center,a=o.bearing,n=o.scale,s=i.pointLocation(r),l=i.locationPoint(s);"rotate"===e&&(i.bearing=this._startBearing+a),i.zoom=i.scaleZoom(this._startScale*n),i.setLocationAtPoint(this._startAround,l),this._map.fire(new t.Event(e,{originalEvent:this._lastTouchEvent})),this._map.fire(new t.Event("move",{originalEvent:this._lastTouchEvent})),this._drainInertiaBuffer(),this._inertia.push([t.browser.now(),n,r]);}},Lo.prototype._onEnd=function(e){i.removeEventListener(t.window.document,"touchmove",this._onMove,{passive:!1}),i.removeEventListener(t.window.document,"touchend",this._onEnd);var o=this._gestureIntent,r=this._startScale;if(this._frameId&&(this._map._cancelRenderFrame(this._frameId),this._frameId=null),delete this._gestureIntent,delete this._startScale,delete this._startBearing,delete this._lastTouchEvent,o){this._map.fire(new t.Event(o+"end",{originalEvent:e})),this._drainInertiaBuffer();var a=this._inertia,n=this._map;if(a.length<2)n.snapToNorth({},{originalEvent:e});else{var s=a[a.length-1],l=a[0],c=n.transform.scaleZoom(r*s[1]),u=n.transform.scaleZoom(r*l[1]),h=c-u,p=(s[0]-l[0])/1e3,d=s[2];if(0!==p&&c!==u){var _=.15*h/p;Math.abs(_)>2.5&&(_=_>0?2.5:-2.5);var f=1e3*Math.abs(_/(12*.15)),m=c+_*f/2e3;m<0&&(m=0),n.easeTo({zoom:m,duration:f,easing:zo,around:this._aroundCenter?n.getCenter():n.unproject(d),noMoveStart:!0},{originalEvent:e});}else n.snapToNorth({},{originalEvent:e});}}},Lo.prototype._drainInertiaBuffer=function(){for(var e=this._inertia,i=t.browser.now();e.length>2&&i-e[0][0]>160;)e.shift();};var Do={scrollZoom:xo,boxZoom:bo,dragRotate:Eo,dragPan:Io,keyboard:Co,doubleClickZoom:Po,touchZoomRotate:Lo};var Mo=function(e){function i(i,o){e.call(this),this._moving=!1,this._zooming=!1,this.transform=i,this._bearingSnap=o.bearingSnap,t.bindAll(["_renderFrameCallback"],this);}return e&&(i.__proto__=e),i.prototype=Object.create(e&&e.prototype),i.prototype.constructor=i,i.prototype.getCenter=function(){return new t.LngLat(this.transform.center.lng,this.transform.center.lat)},i.prototype.setCenter=function(t,e){return this.jumpTo({center:t},e)},i.prototype.panBy=function(e,i,o){return e=t.Point.convert(e).mult(-1),this.panTo(this.transform.center,t.extend({offset:e},i),o)},i.prototype.panTo=function(e,i,o){return this.easeTo(t.extend({center:e},i),o)},i.prototype.getZoom=function(){return this.transform.zoom},i.prototype.setZoom=function(t,e){return this.jumpTo({zoom:t},e),this},i.prototype.zoomTo=function(e,i,o){return this.easeTo(t.extend({zoom:e},i),o)},i.prototype.zoomIn=function(t,e){return this.zoomTo(this.getZoom()+1,t,e),this},i.prototype.zoomOut=function(t,e){return this.zoomTo(this.getZoom()-1,t,e),this},i.prototype.getBearing=function(){return this.transform.bearing},i.prototype.setBearing=function(t,e){return this.jumpTo({bearing:t},e),this},i.prototype.rotateTo=function(e,i,o){return this.easeTo(t.extend({bearing:e},i),o)},i.prototype.resetNorth=function(e,i){return this.rotateTo(0,t.extend({duration:1e3},e),i),this},i.prototype.resetNorthPitch=function(e,i){return this.easeTo(t.extend({bearing:0,pitch:0,duration:1e3},e),i),this},i.prototype.snapToNorth=function(t,e){return Math.abs(this.getBearing())<this._bearingSnap?this.resetNorth(t,e):this},i.prototype.getPitch=function(){return this.transform.pitch},i.prototype.setPitch=function(t,e){return this.jumpTo({pitch:t},e),this},i.prototype.cameraForBounds=function(e,i){return e=t.LngLatBounds.convert(e),this._cameraForBoxAndBearing(e.getNorthWest(),e.getSouthEast(),0,i)},i.prototype._cameraForBoxAndBearing=function(e,i,o,r){if("number"==typeof(r=t.extend({padding:{top:0,bottom:0,right:0,left:0},offset:[0,0],maxZoom:this.transform.maxZoom},r)).padding){var a=r.padding;r.padding={top:a,bottom:a,right:a,left:a};}if(t.deepEqual(Object.keys(r.padding).sort((function(t,e){return t<e?-1:t>e?1:0})),["bottom","left","right","top"])){var n=this.transform,s=n.project(t.LngLat.convert(e)),l=n.project(t.LngLat.convert(i)),c=s.rotate(-o*Math.PI/180),u=l.rotate(-o*Math.PI/180),h=new t.Point(Math.max(c.x,u.x),Math.max(c.y,u.y)),p=new t.Point(Math.min(c.x,u.x),Math.min(c.y,u.y)),d=h.sub(p),_=(n.width-r.padding.left-r.padding.right)/d.x,f=(n.height-r.padding.top-r.padding.bottom)/d.y;if(!(f<0||_<0)){var m=Math.min(n.scaleZoom(n.scale*Math.min(_,f)),r.maxZoom),g=t.Point.convert(r.offset),v=(r.padding.left-r.padding.right)/2,y=(r.padding.top-r.padding.bottom)/2,x=new t.Point(g.x+v,g.y+y).mult(n.scale/n.zoomScale(m));return {center:n.unproject(s.add(l).div(2).sub(x)),zoom:m,bearing:o}}t.warnOnce("Map cannot fit within canvas with the given bounds, padding, and/or offset.");}else t.warnOnce("options.padding must be a positive number, or an Object with keys 'bottom', 'left', 'right', 'top'");},i.prototype.fitBounds=function(t,e,i){return this._fitInternal(this.cameraForBounds(t,e),e,i)},i.prototype.fitScreenCoordinates=function(e,i,o,r,a){return this._fitInternal(this._cameraForBoxAndBearing(this.transform.pointLocation(t.Point.convert(e)),this.transform.pointLocation(t.Point.convert(i)),o,r),r,a)},i.prototype._fitInternal=function(e,i,o){return e?(i=t.extend(e,i)).linear?this.easeTo(i,o):this.flyTo(i,o):this},i.prototype.jumpTo=function(e,i){this.stop();var o=this.transform,r=!1,a=!1,n=!1;return "zoom"in e&&o.zoom!==+e.zoom&&(r=!0,o.zoom=+e.zoom),void 0!==e.center&&(o.center=t.LngLat.convert(e.center)),"bearing"in e&&o.bearing!==+e.bearing&&(a=!0,o.bearing=+e.bearing),"pitch"in e&&o.pitch!==+e.pitch&&(n=!0,o.pitch=+e.pitch),this.fire(new t.Event("movestart",i)).fire(new t.Event("move",i)),r&&this.fire(new t.Event("zoomstart",i)).fire(new t.Event("zoom",i)).fire(new t.Event("zoomend",i)),a&&this.fire(new t.Event("rotatestart",i)).fire(new t.Event("rotate",i)).fire(new t.Event("rotateend",i)),n&&this.fire(new t.Event("pitchstart",i)).fire(new t.Event("pitch",i)).fire(new t.Event("pitchend",i)),this.fire(new t.Event("moveend",i))},i.prototype.easeTo=function(e,i){var o=this;this.stop(),(!1===(e=t.extend({offset:[0,0],duration:500,easing:t.ease},e)).animate||t.browser.prefersReducedMotion)&&(e.duration=0);var r=this.transform,a=this.getZoom(),n=this.getBearing(),s=this.getPitch(),l="zoom"in e?+e.zoom:a,c="bearing"in e?this._normalizeBearing(e.bearing,n):n,u="pitch"in e?+e.pitch:s,h=r.centerPoint.add(t.Point.convert(e.offset)),p=r.pointLocation(h),d=t.LngLat.convert(e.center||p);this._normalizeCenter(d);var _,f,m=r.project(p),g=r.project(d).sub(m),v=r.zoomScale(l-a);return e.around&&(_=t.LngLat.convert(e.around),f=r.locationPoint(_)),this._zooming=l!==a,this._rotating=n!==c,this._pitching=u!==s,this._prepareEase(i,e.noMoveStart),clearTimeout(this._easeEndTimeoutID),this._ease((function(e){if(o._zooming&&(r.zoom=t.number(a,l,e)),o._rotating&&(r.bearing=t.number(n,c,e)),o._pitching&&(r.pitch=t.number(s,u,e)),_)r.setLocationAtPoint(_,f);else{var p=r.zoomScale(r.zoom-a),d=l>a?Math.min(2,v):Math.max(.5,v),y=Math.pow(d,1-e),x=r.unproject(m.add(g.mult(e*y)).mult(p));r.setLocationAtPoint(r.renderWorldCopies?x.wrap():x,h);}o._fireMoveEvents(i);}),(function(){e.delayEndEvents?o._easeEndTimeoutID=setTimeout((function(){return o._afterEase(i)}),e.delayEndEvents):o._afterEase(i);}),e),this},i.prototype._prepareEase=function(e,i){this._moving=!0,i||this.fire(new t.Event("movestart",e)),this._zooming&&this.fire(new t.Event("zoomstart",e)),this._rotating&&this.fire(new t.Event("rotatestart",e)),this._pitching&&this.fire(new t.Event("pitchstart",e));},i.prototype._fireMoveEvents=function(e){this.fire(new t.Event("move",e)),this._zooming&&this.fire(new t.Event("zoom",e)),this._rotating&&this.fire(new t.Event("rotate",e)),this._pitching&&this.fire(new t.Event("pitch",e));},i.prototype._afterEase=function(e){var i=this._zooming,o=this._rotating,r=this._pitching;this._moving=!1,this._zooming=!1,this._rotating=!1,this._pitching=!1,i&&this.fire(new t.Event("zoomend",e)),o&&this.fire(new t.Event("rotateend",e)),r&&this.fire(new t.Event("pitchend",e)),this.fire(new t.Event("moveend",e));},i.prototype.flyTo=function(e,i){var o=this;if(t.browser.prefersReducedMotion){var r=t.pick(e,["center","zoom","bearing","pitch","around"]);return this.jumpTo(r,i)}this.stop(),e=t.extend({offset:[0,0],speed:1.2,curve:1.42,easing:t.ease},e);var a=this.transform,n=this.getZoom(),s=this.getBearing(),l=this.getPitch(),c="zoom"in e?t.clamp(+e.zoom,a.minZoom,a.maxZoom):n,u="bearing"in e?this._normalizeBearing(e.bearing,s):s,h="pitch"in e?+e.pitch:l,p=a.zoomScale(c-n),d=a.centerPoint.add(t.Point.convert(e.offset)),_=a.pointLocation(d),f=t.LngLat.convert(e.center||_);this._normalizeCenter(f);var m=a.project(_),g=a.project(f).sub(m),v=e.curve,y=Math.max(a.width,a.height),x=y/p,b=g.mag();if("minZoom"in e){var w=t.clamp(Math.min(e.minZoom,n,c),a.minZoom,a.maxZoom),E=y/a.zoomScale(w-n);v=Math.sqrt(E/b*2);}var T=v*v;function I(t){var e=(x*x-y*y+(t?-1:1)*T*T*b*b)/(2*(t?x:y)*T*b);return Math.log(Math.sqrt(e*e+1)-e)}function C(t){return (Math.exp(t)-Math.exp(-t))/2}function S(t){return (Math.exp(t)+Math.exp(-t))/2}var P=I(0),z=function(t){return S(P)/S(P+v*t)},L=function(t){return y*((S(P)*(C(e=P+v*t)/S(e))-C(P))/T)/b;var e;},D=(I(1)-P)/v;if(Math.abs(b)<1e-6||!isFinite(D)){if(Math.abs(y-x)<1e-6)return this.easeTo(e,i);var M=x<y?-1:1;D=Math.abs(Math.log(x/y))/v,L=function(){return 0},z=function(t){return Math.exp(M*v*t)};}if("duration"in e)e.duration=+e.duration;else{var R="screenSpeed"in e?+e.screenSpeed/v:+e.speed;e.duration=1e3*D/R;}return e.maxDuration&&e.duration>e.maxDuration&&(e.duration=0),this._zooming=!0,this._rotating=s!==u,this._pitching=h!==l,this._prepareEase(i,!1),this._ease((function(e){var r=e*D,p=1/z(r);a.zoom=1===e?c:n+a.scaleZoom(p),o._rotating&&(a.bearing=t.number(s,u,e)),o._pitching&&(a.pitch=t.number(l,h,e));var _=1===e?f:a.unproject(m.add(g.mult(L(r))).mult(p));a.setLocationAtPoint(a.renderWorldCopies?_.wrap():_,d),o._fireMoveEvents(i);}),(function(){return o._afterEase(i)}),e),this},i.prototype.isEasing=function(){return !!this._easeFrameId},i.prototype.stop=function(){if(this._easeFrameId&&(this._cancelRenderFrame(this._easeFrameId),delete this._easeFrameId,delete this._onEaseFrame),this._onEaseEnd){var t=this._onEaseEnd;delete this._onEaseEnd,t.call(this);}return this},i.prototype._ease=function(e,i,o){!1===o.animate||0===o.duration?(e(1),i()):(this._easeStart=t.browser.now(),this._easeOptions=o,this._onEaseFrame=e,this._onEaseEnd=i,this._easeFrameId=this._requestRenderFrame(this._renderFrameCallback));},i.prototype._renderFrameCallback=function(){var e=Math.min((t.browser.now()-this._easeStart)/this._easeOptions.duration,1);this._onEaseFrame(this._easeOptions.easing(e)),e<1?this._easeFrameId=this._requestRenderFrame(this._renderFrameCallback):this.stop();},i.prototype._normalizeBearing=function(e,i){e=t.wrap(e,-180,180);var o=Math.abs(e-i);return Math.abs(e-360-i)<o&&(e-=360),Math.abs(e+360-i)<o&&(e+=360),e},i.prototype._normalizeCenter=function(t){var e=this.transform;if(e.renderWorldCopies&&!e.lngRange){var i=t.lng-e.center.lng;t.lng+=i>180?-360:i<-180?360:0;}},i}(t.Evented),Ro=function(e){void 0===e&&(e={}),this.options=e,t.bindAll(["_updateEditLink","_updateData","_updateCompact"],this);};Ro.prototype.getDefaultPosition=function(){return "bottom-right"},Ro.prototype.onAdd=function(t){var e=this.options&&this.options.compact;return this._map=t,this._container=i.create("div","mapboxgl-ctrl mapboxgl-ctrl-attrib"),this._innerContainer=i.create("div","mapboxgl-ctrl-attrib-inner",this._container),e&&this._container.classList.add("mapboxgl-compact"),this._updateAttributions(),this._updateEditLink(),this._map.on("styledata",this._updateData),this._map.on("sourcedata",this._updateData),this._map.on("moveend",this._updateEditLink),void 0===e&&(this._map.on("resize",this._updateCompact),this._updateCompact()),this._container},Ro.prototype.onRemove=function(){i.remove(this._container),this._map.off("styledata",this._updateData),this._map.off("sourcedata",this._updateData),this._map.off("moveend",this._updateEditLink),this._map.off("resize",this._updateCompact),this._map=void 0;},Ro.prototype._updateEditLink=function(){var e=this._editLink;e||(e=this._editLink=this._container.querySelector(".mapbox-improve-map"));var i=[{key:"owner",value:this.styleOwner},{key:"id",value:this.styleId},{key:"access_token",value:this._map._requestManager._customAccessToken||t.config.ACCESS_TOKEN}];if(e){var o=i.reduce((function(t,e,o){return e.value&&(t+=e.key+"="+e.value+(o<i.length-1?"&":"")),t}),"?");e.href=t.config.FEEDBACK_URL+"/"+o+(this._map._hash?this._map._hash.getHashString(!0):""),e.rel="noopener nofollow";}},Ro.prototype._updateData=function(t){!t||"metadata"!==t.sourceDataType&&"style"!==t.dataType||(this._updateAttributions(),this._updateEditLink());},Ro.prototype._updateAttributions=function(){if(this._map.style){var t=[];if(this.options.customAttribution&&(Array.isArray(this.options.customAttribution)?t=t.concat(this.options.customAttribution.map((function(t){return "string"!=typeof t?"":t}))):"string"==typeof this.options.customAttribution&&t.push(this.options.customAttribution)),this._map.style.stylesheet){var e=this._map.style.stylesheet;this.styleOwner=e.owner,this.styleId=e.id;}var i=this._map.style.sourceCaches;for(var o in i){var r=i[o];if(r.used){var a=r.getSource();a.attribution&&t.indexOf(a.attribution)<0&&t.push(a.attribution);}}t.sort((function(t,e){return t.length-e.length}));var n=(t=t.filter((function(e,i){for(var o=i+1;o<t.length;o++)if(t[o].indexOf(e)>=0)return !1;return !0}))).join(" | ");n!==this._attribHTML&&(this._attribHTML=n,t.length?(this._innerContainer.innerHTML=n,this._container.classList.remove("mapboxgl-attrib-empty")):this._container.classList.add("mapboxgl-attrib-empty"),this._editLink=null);}},Ro.prototype._updateCompact=function(){this._map.getCanvasContainer().offsetWidth<=640?this._container.classList.add("mapboxgl-compact"):this._container.classList.remove("mapboxgl-compact");};var Ao=function(){t.bindAll(["_updateLogo"],this),t.bindAll(["_updateCompact"],this);};Ao.prototype.onAdd=function(t){this._map=t,this._container=i.create("div","mapboxgl-ctrl");var e=i.create("a","mapboxgl-ctrl-logo");return e.target="_blank",e.rel="noopener nofollow",e.href="https://www.mapbox.com/",e.setAttribute("aria-label","Mapbox logo"),e.setAttribute("rel","noopener nofollow"),this._container.appendChild(e),this._container.style.display="none",this._map.on("sourcedata",this._updateLogo),this._updateLogo(),this._map.on("resize",this._updateCompact),this._updateCompact(),this._container},Ao.prototype.onRemove=function(){i.remove(this._container),this._map.off("sourcedata",this._updateLogo),this._map.off("resize",this._updateCompact);},Ao.prototype.getDefaultPosition=function(){return "bottom-left"},Ao.prototype._updateLogo=function(t){t&&"metadata"!==t.sourceDataType||(this._container.style.display=this._logoRequired()?"block":"none");},Ao.prototype._logoRequired=function(){if(this._map.style){var t=this._map.style.sourceCaches;for(var e in t){if(t[e].getSource().mapbox_logo)return !0}return !1}},Ao.prototype._updateCompact=function(){var t=this._container.children;if(t.length){var e=t[0];this._map.getCanvasContainer().offsetWidth<250?e.classList.add("mapboxgl-compact"):e.classList.remove("mapboxgl-compact");}};var ko=function(){this._queue=[],this._id=0,this._cleared=!1,this._currentlyRunning=!1;};ko.prototype.add=function(t){var e=++this._id;return this._queue.push({callback:t,id:e,cancelled:!1}),e},ko.prototype.remove=function(t){for(var e=this._currentlyRunning,i=0,o=e?this._queue.concat(e):this._queue;i<o.length;i+=1){var r=o[i];if(r.id===t)return void(r.cancelled=!0)}},ko.prototype.run=function(){var t=this._currentlyRunning=this._queue;this._queue=[];for(var e=0,i=t;e<i.length;e+=1){var o=i[e];if(!o.cancelled&&(o.callback(),this._cleared))break}this._cleared=!1,this._currentlyRunning=!1;},ko.prototype.clear=function(){this._currentlyRunning&&(this._cleared=!0),this._queue=[];};var Bo=t.window.HTMLImageElement,Oo=t.window.HTMLElement,Fo={center:[0,0],zoom:0,bearing:0,pitch:0,minZoom:0,maxZoom:22,interactive:!0,scrollZoom:!0,boxZoom:!0,dragRotate:!0,dragPan:!0,keyboard:!0,doubleClickZoom:!0,touchZoomRotate:!0,bearingSnap:7,clickTolerance:3,hash:!1,attributionControl:!0,failIfMajorPerformanceCaveat:!1,preserveDrawingBuffer:!1,trackResize:!0,renderWorldCopies:!0,refreshExpiredTiles:!0,maxTileCacheSize:null,localIdeographFontFamily:"sans-serif",transformRequest:null,accessToken:null,fadeDuration:300,crossSourceCollisions:!0},Uo=function(o){function r(e){var r=this;if(null!=(e=t.extend({},Fo,e)).minZoom&&null!=e.maxZoom&&e.minZoom>e.maxZoom)throw new Error("maxZoom must be greater than minZoom");var a=new _o(e.minZoom,e.maxZoom,e.renderWorldCopies);if(o.call(this,a,e),this._interactive=e.interactive,this._maxTileCacheSize=e.maxTileCacheSize,this._failIfMajorPerformanceCaveat=e.failIfMajorPerformanceCaveat,this._preserveDrawingBuffer=e.preserveDrawingBuffer,this._antialias=e.antialias,this._trackResize=e.trackResize,this._bearingSnap=e.bearingSnap,this._refreshExpiredTiles=e.refreshExpiredTiles,this._fadeDuration=e.fadeDuration,this._crossSourceCollisions=e.crossSourceCollisions,this._crossFadingFactor=1,this._collectResourceTiming=e.collectResourceTiming,this._renderTaskQueue=new ko,this._controls=[],this._mapId=t.uniqueId(),this._requestManager=new t.RequestManager(e.transformRequest,e.accessToken),"string"==typeof e.container){if(this._container=t.window.document.getElementById(e.container),!this._container)throw new Error("Container '"+e.container+"' not found.")}else{if(!(e.container instanceof Oo))throw new Error("Invalid type: 'container' must be a String or HTMLElement.");this._container=e.container;}if(e.maxBounds&&this.setMaxBounds(e.maxBounds),t.bindAll(["_onWindowOnline","_onWindowResize","_contextLost","_contextRestored"],this),this._setupContainer(),this._setupPainter(),void 0===this.painter)throw new Error("Failed to initialize WebGL.");this.on("move",(function(){return r._update(!1)})),this.on("moveend",(function(){return r._update(!1)})),this.on("zoom",(function(){return r._update(!0)})),void 0!==t.window&&(t.window.addEventListener("online",this._onWindowOnline,!1),t.window.addEventListener("resize",this._onWindowResize,!1)),function(t,e){var o=t.getCanvasContainer(),r=null,a=!1,n=null;for(var s in Do)t[s]=new Do[s](t,e),e.interactive&&e[s]&&t[s].enable(e[s]);i.addEventListener(o,"mouseout",(function(e){t.fire(new go("mouseout",t,e));})),i.addEventListener(o,"mousedown",(function(r){a=!0,n=i.mousePos(o,r);var s=new go("mousedown",t,r);if(t.fire(s),s.defaultPrevented)return;e.interactive&&!t.doubleClickZoom.isActive()&&t.stop();t.boxZoom.onMouseDown(r),t.boxZoom.isActive()||t.dragPan.isActive()||t.dragRotate.onMouseDown(r);t.boxZoom.isActive()||t.dragRotate.isActive()||t.dragPan.onMouseDown(r);})),i.addEventListener(o,"mouseup",(function(e){var i=t.dragRotate.isActive();r&&!i&&t.fire(new go("contextmenu",t,r));r=null,a=!1,t.fire(new go("mouseup",t,e));})),i.addEventListener(o,"mousemove",(function(e){if(t.dragPan.isActive())return;if(t.dragRotate.isActive())return;var i=e.target;for(;i&&i!==o;)i=i.parentNode;if(i!==o)return;t.fire(new go("mousemove",t,e));})),i.addEventListener(o,"mouseover",(function(e){var i=e.target;for(;i&&i!==o;)i=i.parentNode;if(i!==o)return;t.fire(new go("mouseover",t,e));})),i.addEventListener(o,"touchstart",(function(i){var o=new vo("touchstart",t,i);if(t.fire(o),o.defaultPrevented)return;e.interactive&&t.stop();t.boxZoom.isActive()||t.dragRotate.isActive()||t.dragPan.onTouchStart(i);t.touchZoomRotate.onStart(i),t.doubleClickZoom.onTouchStart(o);}),{passive:!1}),i.addEventListener(o,"touchmove",(function(e){t.fire(new vo("touchmove",t,e));}),{passive:!1}),i.addEventListener(o,"touchend",(function(e){t.fire(new vo("touchend",t,e));})),i.addEventListener(o,"touchcancel",(function(e){t.fire(new vo("touchcancel",t,e));})),i.addEventListener(o,"click",(function(r){var a=i.mousePos(o,r);(!n||a.equals(n)||a.dist(n)<e.clickTolerance)&&t.fire(new go("click",t,r));})),i.addEventListener(o,"dblclick",(function(e){var i=new go("dblclick",t,e);if(t.fire(i),i.defaultPrevented)return;t.doubleClickZoom.onDblClick(i);})),i.addEventListener(o,"contextmenu",(function(e){var i=t.dragRotate.isActive();a||i?a&&(r=e):t.fire(new go("contextmenu",t,e));(t.dragRotate.isEnabled()||t.listens("contextmenu"))&&e.preventDefault();})),i.addEventListener(o,"wheel",(function(i){e.interactive&&t.stop();var o=new yo("wheel",t,i);if(t.fire(o),o.defaultPrevented)return;t.scrollZoom.onWheel(i);}),{passive:!1});}(this,e),this._hash=e.hash&&(new mo).addTo(this),this._hash&&this._hash._onHashChange()||(this.jumpTo({center:e.center,zoom:e.zoom,bearing:e.bearing,pitch:e.pitch}),e.bounds&&(this.resize(),this.fitBounds(e.bounds,t.extend({},e.fitBoundsOptions,{duration:0})))),this.resize(),this._localIdeographFontFamily=e.localIdeographFontFamily,e.style&&this.setStyle(e.style,{localIdeographFontFamily:e.localIdeographFontFamily}),e.attributionControl&&this.addControl(new Ro({customAttribution:e.customAttribution})),this.addControl(new Ao,e.logoPosition),this.on("style.load",(function(){r.transform.unmodified&&r.jumpTo(r.style.stylesheet);})),this.on("data",(function(e){r._update("style"===e.dataType),r.fire(new t.Event(e.dataType+"data",e));})),this.on("dataloading",(function(e){r.fire(new t.Event(e.dataType+"dataloading",e));}));}o&&(r.__proto__=o),r.prototype=Object.create(o&&o.prototype),r.prototype.constructor=r;var a={showTileBoundaries:{configurable:!0},showCollisionBoxes:{configurable:!0},showOverdrawInspector:{configurable:!0},repaint:{configurable:!0},vertices:{configurable:!0},version:{configurable:!0}};return r.prototype._getMapId=function(){return this._mapId},r.prototype.addControl=function(e,i){if(void 0===i&&e.getDefaultPosition&&(i=e.getDefaultPosition()),void 0===i&&(i="top-right"),!e||!e.onAdd)return this.fire(new t.ErrorEvent(new Error("Invalid argument to map.addControl(). Argument must be a control with onAdd and onRemove methods.")));var o=e.onAdd(this);this._controls.push(e);var r=this._controlPositions[i];return -1!==i.indexOf("bottom")?r.insertBefore(o,r.firstChild):r.appendChild(o),this},r.prototype.removeControl=function(e){if(!e||!e.onRemove)return this.fire(new t.ErrorEvent(new Error("Invalid argument to map.removeControl(). Argument must be a control with onAdd and onRemove methods.")));var i=this._controls.indexOf(e);return i>-1&&this._controls.splice(i,1),e.onRemove(this),this},r.prototype.resize=function(e){var i=this._containerDimensions(),o=i[0],r=i[1];return this._resizeCanvas(o,r),this.transform.resize(o,r),this.painter.resize(o,r),this.fire(new t.Event("movestart",e)).fire(new t.Event("move",e)).fire(new t.Event("resize",e)).fire(new t.Event("moveend",e)),this},r.prototype.getBounds=function(){return this.transform.getBounds()},r.prototype.getMaxBounds=function(){return this.transform.getMaxBounds()},r.prototype.setMaxBounds=function(e){return this.transform.setMaxBounds(t.LngLatBounds.convert(e)),this._update()},r.prototype.setMinZoom=function(t){if((t=null==t?0:t)>=0&&t<=this.transform.maxZoom)return this.transform.minZoom=t,this._update(),this.getZoom()<t&&this.setZoom(t),this;throw new Error("minZoom must be between 0 and the current maxZoom, inclusive")},r.prototype.getMinZoom=function(){return this.transform.minZoom},r.prototype.setMaxZoom=function(t){if((t=null==t?22:t)>=this.transform.minZoom)return this.transform.maxZoom=t,this._update(),this.getZoom()>t&&this.setZoom(t),this;throw new Error("maxZoom must be greater than the current minZoom")},r.prototype.getMaxZoom=function(){return this.transform.maxZoom},r.prototype.getRenderWorldCopies=function(){return this.transform.renderWorldCopies},r.prototype.setRenderWorldCopies=function(t){return this.transform.renderWorldCopies=t,this._update()},r.prototype.project=function(e){return this.transform.locationPoint(t.LngLat.convert(e))},r.prototype.unproject=function(e){return this.transform.pointLocation(t.Point.convert(e))},r.prototype.isMoving=function(){return this._moving||this.dragPan.isActive()||this.dragRotate.isActive()||this.scrollZoom.isActive()},r.prototype.isZooming=function(){return this._zooming||this.scrollZoom.isZooming()},r.prototype.isRotating=function(){return this._rotating||this.dragRotate.isActive()},r.prototype.on=function(t,e,i){var r=this;if(void 0===i)return o.prototype.on.call(this,t,e);var a=function(){var o;if("mouseenter"===t||"mouseover"===t){var a=!1;return {layer:e,listener:i,delegates:{mousemove:function(o){var n=r.getLayer(e)?r.queryRenderedFeatures(o.point,{layers:[e]}):[];n.length?a||(a=!0,i.call(r,new go(t,r,o.originalEvent,{features:n}))):a=!1;},mouseout:function(){a=!1;}}}}if("mouseleave"===t||"mouseout"===t){var n=!1;return {layer:e,listener:i,delegates:{mousemove:function(o){(r.getLayer(e)?r.queryRenderedFeatures(o.point,{layers:[e]}):[]).length?n=!0:n&&(n=!1,i.call(r,new go(t,r,o.originalEvent)));},mouseout:function(e){n&&(n=!1,i.call(r,new go(t,r,e.originalEvent)));}}}}return {layer:e,listener:i,delegates:(o={},o[t]=function(t){var o=r.getLayer(e)?r.queryRenderedFeatures(t.point,{layers:[e]}):[];o.length&&(t.features=o,i.call(r,t),delete t.features);},o)}}();for(var n in this._delegatedListeners=this._delegatedListeners||{},this._delegatedListeners[t]=this._delegatedListeners[t]||[],this._delegatedListeners[t].push(a),a.delegates)this.on(n,a.delegates[n]);return this},r.prototype.off=function(t,e,i){if(void 0===i)return o.prototype.off.call(this,t,e);if(this._delegatedListeners&&this._delegatedListeners[t])for(var r=this._delegatedListeners[t],a=0;a<r.length;a++){var n=r[a];if(n.layer===e&&n.listener===i){for(var s in n.delegates)this.off(s,n.delegates[s]);return r.splice(a,1),this}}return this},r.prototype.queryRenderedFeatures=function(e,i){if(!this.style)return [];var o;if(void 0!==i||void 0===e||e instanceof t.Point||Array.isArray(e)||(i=e,e=void 0),i=i||{},(e=e||[[0,0],[this.transform.width,this.transform.height]])instanceof t.Point||"number"==typeof e[0])o=[t.Point.convert(e)];else{var r=t.Point.convert(e[0]),a=t.Point.convert(e[1]);o=[r,new t.Point(a.x,r.y),a,new t.Point(r.x,a.y),r];}return this.style.queryRenderedFeatures(o,i,this.transform)},r.prototype.querySourceFeatures=function(t,e){return this.style.querySourceFeatures(t,e)},r.prototype.setStyle=function(e,i){return !1!==(i=t.extend({},{localIdeographFontFamily:this._localIdeographFontFamily},i)).diff&&i.localIdeographFontFamily===this._localIdeographFontFamily&&this.style&&e?(this._diffStyle(e,i),this):(this._localIdeographFontFamily=i.localIdeographFontFamily,this._updateStyle(e,i))},r.prototype._updateStyle=function(t,e){return this.style&&(this.style.setEventedParent(null),this.style._remove()),t?(this.style=new Fe(this,e||{}),this.style.setEventedParent(this,{style:this.style}),"string"==typeof t?this.style.loadURL(t):this.style.loadJSON(t),this):(delete this.style,this)},r.prototype._diffStyle=function(e,i){var o=this;if("string"==typeof e){var r=this._requestManager.normalizeStyleURL(e),a=this._requestManager.transformRequest(r,t.ResourceType.Style);t.getJSON(a,(function(e,r){e?o.fire(new t.ErrorEvent(e)):r&&o._updateDiff(r,i);}));}else"object"==typeof e&&this._updateDiff(e,i);},r.prototype._updateDiff=function(e,i){try{this.style.setState(e)&&this._update(!0);}catch(o){t.warnOnce("Unable to perform style diff: "+(o.message||o.error||o)+".  Rebuilding the style from scratch."),this._updateStyle(e,i);}},r.prototype.getStyle=function(){if(this.style)return this.style.serialize()},r.prototype.isStyleLoaded=function(){return this.style?this.style.loaded():t.warnOnce("There is no style added to the map.")},r.prototype.addSource=function(t,e){return this.style.addSource(t,e),this._update(!0)},r.prototype.isSourceLoaded=function(e){var i=this.style&&this.style.sourceCaches[e];if(void 0!==i)return i.loaded();this.fire(new t.ErrorEvent(new Error("There is no source with ID '"+e+"'")));},r.prototype.areTilesLoaded=function(){var t=this.style&&this.style.sourceCaches;for(var e in t){var i=t[e]._tiles;for(var o in i){var r=i[o];if("loaded"!==r.state&&"errored"!==r.state)return !1}}return !0},r.prototype.addSourceType=function(t,e,i){return this.style.addSourceType(t,e,i)},r.prototype.removeSource=function(t){return this.style.removeSource(t),this._update(!0)},r.prototype.getSource=function(t){return this.style.getSource(t)},r.prototype.addImage=function(e,i,o){void 0===o&&(o={});var r=o.pixelRatio;void 0===r&&(r=1);var a=o.sdf;void 0===a&&(a=!1);if(i instanceof Bo){var n=t.browser.getImageData(i),s=n.width,l=n.height,c=n.data;this.style.addImage(e,{data:new t.RGBAImage({width:s,height:l},c),pixelRatio:r,sdf:a,version:0});}else{if(void 0===i.width||void 0===i.height)return this.fire(new t.ErrorEvent(new Error("Invalid arguments to map.addImage(). The second argument must be an `HTMLImageElement`, `ImageData`, or object with `width`, `height`, and `data` properties with the same format as `ImageData`")));var u=i.width,h=i.height,p=i.data,d=i;this.style.addImage(e,{data:new t.RGBAImage({width:u,height:h},new Uint8Array(p)),pixelRatio:r,sdf:a,version:0,userImage:d}),d.onAdd&&d.onAdd(this,e);}},r.prototype.updateImage=function(e,i){var o=this.style.getImage(e);if(!o)return this.fire(new t.ErrorEvent(new Error("The map has no image with that id. If you are adding a new image use `map.addImage(...)` instead.")));var r=i instanceof Bo?t.browser.getImageData(i):i,a=r.width,n=r.height,s=r.data;if(void 0===a||void 0===n)return this.fire(new t.ErrorEvent(new Error("Invalid arguments to map.updateImage(). The second argument must be an `HTMLImageElement`, `ImageData`, or object with `width`, `height`, and `data` properties with the same format as `ImageData`")));if(a!==o.data.width||n!==o.data.height)return this.fire(new t.ErrorEvent(new Error("The width and height of the updated image must be that same as the previous version of the image")));var l=!(i instanceof Bo);o.data.replace(s,l),this.style.updateImage(e,o);},r.prototype.hasImage=function(e){return e?!!this.style.getImage(e):(this.fire(new t.ErrorEvent(new Error("Missing required image id"))),!1)},r.prototype.removeImage=function(t){this.style.removeImage(t);},r.prototype.loadImage=function(e,i){t.getImage(this._requestManager.transformRequest(e,t.ResourceType.Image),i);},r.prototype.listImages=function(){return this.style.listImages()},r.prototype.addLayer=function(t,e){return this.style.addLayer(t,e),this._update(!0)},r.prototype.moveLayer=function(t,e){return this.style.moveLayer(t,e),this._update(!0)},r.prototype.removeLayer=function(t){return this.style.removeLayer(t),this._update(!0)},r.prototype.getLayer=function(t){return this.style.getLayer(t)},r.prototype.setLayerZoomRange=function(t,e,i){return this.style.setLayerZoomRange(t,e,i),this._update(!0)},r.prototype.setFilter=function(t,e,i){return void 0===i&&(i={}),this.style.setFilter(t,e,i),this._update(!0)},r.prototype.getFilter=function(t){return this.style.getFilter(t)},r.prototype.setPaintProperty=function(t,e,i,o){return void 0===o&&(o={}),this.style.setPaintProperty(t,e,i,o),this._update(!0)},r.prototype.getPaintProperty=function(t,e){return this.style.getPaintProperty(t,e)},r.prototype.setLayoutProperty=function(t,e,i,o){return void 0===o&&(o={}),this.style.setLayoutProperty(t,e,i,o),this._update(!0)},r.prototype.getLayoutProperty=function(t,e){return this.style.getLayoutProperty(t,e)},r.prototype.setLight=function(t,e){return void 0===e&&(e={}),this.style.setLight(t,e),this._update(!0)},r.prototype.getLight=function(){return this.style.getLight()},r.prototype.setFeatureState=function(t,e){return this.style.setFeatureState(t,e),this._update()},r.prototype.removeFeatureState=function(t,e){return this.style.removeFeatureState(t,e),this._update()},r.prototype.getFeatureState=function(t){return this.style.getFeatureState(t)},r.prototype.getContainer=function(){return this._container},r.prototype.getCanvasContainer=function(){return this._canvasContainer},r.prototype.getCanvas=function(){return this._canvas},r.prototype._containerDimensions=function(){var t=0,e=0;return this._container&&(t=this._container.clientWidth||400,e=this._container.clientHeight||300),[t,e]},r.prototype._detectMissingCSS=function(){"rgb(250, 128, 114)"!==t.window.getComputedStyle(this._missingCSSCanary).getPropertyValue("background-color")&&t.warnOnce("This page appears to be missing CSS declarations for Mapbox GL JS, which may cause the map to display incorrectly. Please ensure your page includes mapbox-gl.css, as described in https://www.mapbox.com/mapbox-gl-js/api/.");},r.prototype._setupContainer=function(){var t=this._container;t.classList.add("mapboxgl-map"),(this._missingCSSCanary=i.create("div","mapboxgl-canary",t)).style.visibility="hidden",this._detectMissingCSS();var e=this._canvasContainer=i.create("div","mapboxgl-canvas-container",t);this._interactive&&e.classList.add("mapboxgl-interactive"),this._canvas=i.create("canvas","mapboxgl-canvas",e),this._canvas.style.position="absolute",this._canvas.addEventListener("webglcontextlost",this._contextLost,!1),this._canvas.addEventListener("webglcontextrestored",this._contextRestored,!1),this._canvas.setAttribute("tabindex","0"),this._canvas.setAttribute("aria-label","Map");var o=this._containerDimensions();this._resizeCanvas(o[0],o[1]);var r=this._controlContainer=i.create("div","mapboxgl-control-container",t),a=this._controlPositions={};["top-left","top-right","bottom-left","bottom-right"].forEach((function(t){a[t]=i.create("div","mapboxgl-ctrl-"+t,r);}));},r.prototype._resizeCanvas=function(e,i){var o=t.window.devicePixelRatio||1;this._canvas.width=o*e,this._canvas.height=o*i,this._canvas.style.width=e+"px",this._canvas.style.height=i+"px";},r.prototype._setupPainter=function(){var i=t.extend({},e.webGLContextAttributes,{failIfMajorPerformanceCaveat:this._failIfMajorPerformanceCaveat,preserveDrawingBuffer:this._preserveDrawingBuffer,antialias:this._antialias||!1}),o=this._canvas.getContext("webgl",i)||this._canvas.getContext("experimental-webgl",i);o?(this.painter=new co(o,this.transform),t.webpSupported.testSupport(o)):this.fire(new t.ErrorEvent(new Error("Failed to initialize WebGL")));},r.prototype._contextLost=function(e){e.preventDefault(),this._frame&&(this._frame.cancel(),this._frame=null),this.fire(new t.Event("webglcontextlost",{originalEvent:e}));},r.prototype._contextRestored=function(e){this._setupPainter(),this.resize(),this._update(),this.fire(new t.Event("webglcontextrestored",{originalEvent:e}));},r.prototype.loaded=function(){return !this._styleDirty&&!this._sourcesDirty&&!!this.style&&this.style.loaded()},r.prototype._update=function(t){return this.style?(this._styleDirty=this._styleDirty||t,this._sourcesDirty=!0,this.triggerRepaint(),this):this},r.prototype._requestRenderFrame=function(t){return this._update(),this._renderTaskQueue.add(t)},r.prototype._cancelRenderFrame=function(t){this._renderTaskQueue.remove(t);},r.prototype._render=function(){this.painter.context.setDirty(),this.painter.setBaseState(),this._renderTaskQueue.run();var e=!1;if(this.style&&this._styleDirty){this._styleDirty=!1;var i=this.transform.zoom,o=t.browser.now();this.style.zoomHistory.update(i,o);var r=new t.EvaluationParameters(i,{now:o,fadeDuration:this._fadeDuration,zoomHistory:this.style.zoomHistory,transition:this.style.getTransition()}),a=r.crossFadingFactor();1===a&&a===this._crossFadingFactor||(e=!0,this._crossFadingFactor=a),this.style.update(r);}return this.style&&this._sourcesDirty&&(this._sourcesDirty=!1,this.style._updateSources(this.transform)),this._placementDirty=this.style&&this.style._updatePlacement(this.painter.transform,this.showCollisionBoxes,this._fadeDuration,this._crossSourceCollisions),this.painter.render(this.style,{showTileBoundaries:this.showTileBoundaries,showOverdrawInspector:this._showOverdrawInspector,rotating:this.isRotating(),zooming:this.isZooming(),moving:this.isMoving(),fadeDuration:this._fadeDuration}),this.fire(new t.Event("render")),this.loaded()&&!this._loaded&&(this._loaded=!0,this.fire(new t.Event("load"))),this.style&&(this.style.hasTransitions()||e)&&(this._styleDirty=!0),this.style&&!this._placementDirty&&this.style._releaseSymbolFadeTiles(),this._sourcesDirty||this._repaint||this._styleDirty||this._placementDirty?this.triggerRepaint():!this.isMoving()&&this.loaded()&&this.fire(new t.Event("idle")),this},r.prototype.remove=function(){this._hash&&this._hash.remove();for(var e=0,i=this._controls;e<i.length;e+=1){i[e].onRemove(this);}this._controls=[],this._frame&&(this._frame.cancel(),this._frame=null),this._renderTaskQueue.clear(),this.setStyle(null),void 0!==t.window&&(t.window.removeEventListener("resize",this._onWindowResize,!1),t.window.removeEventListener("online",this._onWindowOnline,!1));var o=this.painter.context.gl.getExtension("WEBGL_lose_context");o&&o.loseContext(),No(this._canvasContainer),No(this._controlContainer),No(this._missingCSSCanary),this._container.classList.remove("mapboxgl-map"),this.fire(new t.Event("remove"));},r.prototype.triggerRepaint=function(){var e=this;this.style&&!this._frame&&(this._frame=t.browser.frame((function(){e._frame=null,e._render();})));},r.prototype._onWindowOnline=function(){this._update();},r.prototype._onWindowResize=function(t){this._trackResize&&this.resize({originalEvent:t})._update();},a.showTileBoundaries.get=function(){return !!this._showTileBoundaries},a.showTileBoundaries.set=function(t){this._showTileBoundaries!==t&&(this._showTileBoundaries=t,this._update());},a.showCollisionBoxes.get=function(){return !!this._showCollisionBoxes},a.showCollisionBoxes.set=function(t){this._showCollisionBoxes!==t&&(this._showCollisionBoxes=t,t?this.style._generateCollisionBoxes():this._update());},a.showOverdrawInspector.get=function(){return !!this._showOverdrawInspector},a.showOverdrawInspector.set=function(t){this._showOverdrawInspector!==t&&(this._showOverdrawInspector=t,this._update());},a.repaint.get=function(){return !!this._repaint},a.repaint.set=function(t){this._repaint!==t&&(this._repaint=t,this.triggerRepaint());},a.vertices.get=function(){return !!this._vertices},a.vertices.set=function(t){this._vertices=t,this._update();},r.prototype._setCacheLimits=function(e,i){t.setCacheLimits(e,i);},a.version.get=function(){return t.version},Object.defineProperties(r.prototype,a),r}(Mo);function No(t){t.parentNode&&t.parentNode.removeChild(t);}var Zo={showCompass:!0,showZoom:!0,visualizePitch:!1},Vo=function(e){var o=this;this.options=t.extend({},Zo,e),this._container=i.create("div","mapboxgl-ctrl mapboxgl-ctrl-group"),this._container.addEventListener("contextmenu",(function(t){return t.preventDefault()})),this.options.showZoom&&(t.bindAll(["_updateZoomButtons"],this),this._zoomInButton=this._createButton("mapboxgl-ctrl-icon mapboxgl-ctrl-zoom-in","Zoom in",(function(t){return o._map.zoomIn({},{originalEvent:t})})),this._zoomOutButton=this._createButton("mapboxgl-ctrl-icon mapboxgl-ctrl-zoom-out","Zoom out",(function(t){return o._map.zoomOut({},{originalEvent:t})}))),this.options.showCompass&&(t.bindAll(["_rotateCompassArrow"],this),this._compass=this._createButton("mapboxgl-ctrl-icon mapboxgl-ctrl-compass","Reset bearing to north",(function(t){o.options.visualizePitch?o._map.resetNorthPitch({},{originalEvent:t}):o._map.resetNorth({},{originalEvent:t});})),this._compassArrow=i.create("span","mapboxgl-ctrl-compass-arrow",this._compass));};function qo(e,i,o){if(e=new t.LngLat(e.lng,e.lat),i){var r=new t.LngLat(e.lng-360,e.lat),a=new t.LngLat(e.lng+360,e.lat),n=o.locationPoint(e).distSqr(i);o.locationPoint(r).distSqr(i)<n?e=r:o.locationPoint(a).distSqr(i)<n&&(e=a);}for(;Math.abs(e.lng-o.center.lng)>180;){var s=o.locationPoint(e);if(s.x>=0&&s.y>=0&&s.x<=o.width&&s.y<=o.height)break;e.lng>o.center.lng?e.lng-=360:e.lng+=360;}return e}Vo.prototype._updateZoomButtons=function(){var t=this._map.getZoom();t===this._map.getMaxZoom()?this._zoomInButton.classList.add("mapboxgl-ctrl-icon-disabled"):this._zoomInButton.classList.remove("mapboxgl-ctrl-icon-disabled"),t===this._map.getMinZoom()?this._zoomOutButton.classList.add("mapboxgl-ctrl-icon-disabled"):this._zoomOutButton.classList.remove("mapboxgl-ctrl-icon-disabled");},Vo.prototype._rotateCompassArrow=function(){var t=this.options.visualizePitch?"scale("+1/Math.pow(Math.cos(this._map.transform.pitch*(Math.PI/180)),.5)+") rotateX("+this._map.transform.pitch+"deg) rotateZ("+this._map.transform.angle*(180/Math.PI)+"deg)":"rotate("+this._map.transform.angle*(180/Math.PI)+"deg)";this._compassArrow.style.transform=t;},Vo.prototype.onAdd=function(t){return this._map=t,this.options.showZoom&&(this._map.on("zoom",this._updateZoomButtons),this._updateZoomButtons()),this.options.showCompass&&(this.options.visualizePitch&&this._map.on("pitch",this._rotateCompassArrow),this._map.on("rotate",this._rotateCompassArrow),this._rotateCompassArrow(),this._handler=new Eo(t,{button:"left",element:this._compass}),i.addEventListener(this._compass,"mousedown",this._handler.onMouseDown),i.addEventListener(this._compass,"touchstart",this._handler.onMouseDown,{passive:!1}),this._handler.enable()),this._container},Vo.prototype.onRemove=function(){i.remove(this._container),this.options.showZoom&&this._map.off("zoom",this._updateZoomButtons),this.options.showCompass&&(this.options.visualizePitch&&this._map.off("pitch",this._rotateCompassArrow),this._map.off("rotate",this._rotateCompassArrow),i.removeEventListener(this._compass,"mousedown",this._handler.onMouseDown),i.removeEventListener(this._compass,"touchstart",this._handler.onMouseDown,{passive:!1}),this._handler.disable(),delete this._handler),delete this._map;},Vo.prototype._createButton=function(t,e,o){var r=i.create("button",t,this._container);return r.type="button",r.title=e,r.setAttribute("aria-label",e),r.addEventListener("click",o),r};var jo={center:"translate(-50%,-50%)",top:"translate(-50%,0)","top-left":"translate(0,0)","top-right":"translate(-100%,0)",bottom:"translate(-50%,-100%)","bottom-left":"translate(0,-100%)","bottom-right":"translate(-100%,-100%)",left:"translate(0,-50%)",right:"translate(-100%,-50%)"};function Go(t,e,i){var o=t.classList;for(var r in jo)o.remove("mapboxgl-"+i+"-anchor-"+r);o.add("mapboxgl-"+i+"-anchor-"+e);}var Wo,Xo=function(e){function o(o,r){if(e.call(this),(o instanceof t.window.HTMLElement||r)&&(o=t.extend({element:o},r)),t.bindAll(["_update","_onMove","_onUp","_addDragHandler","_onMapClick"],this),this._anchor=o&&o.anchor||"center",this._color=o&&o.color||"#3FB1CE",this._draggable=o&&o.draggable||!1,this._state="inactive",o&&o.element)this._element=o.element,this._offset=t.Point.convert(o&&o.offset||[0,0]);else{this._defaultMarker=!0,this._element=i.create("div");var a=i.createNS("http://www.w3.org/2000/svg","svg");a.setAttributeNS(null,"display","block"),a.setAttributeNS(null,"height","41px"),a.setAttributeNS(null,"width","27px"),a.setAttributeNS(null,"viewBox","0 0 27 41");var n=i.createNS("http://www.w3.org/2000/svg","g");n.setAttributeNS(null,"stroke","none"),n.setAttributeNS(null,"stroke-width","1"),n.setAttributeNS(null,"fill","none"),n.setAttributeNS(null,"fill-rule","evenodd");var s=i.createNS("http://www.w3.org/2000/svg","g");s.setAttributeNS(null,"fill-rule","nonzero");var l=i.createNS("http://www.w3.org/2000/svg","g");l.setAttributeNS(null,"transform","translate(3.0, 29.0)"),l.setAttributeNS(null,"fill","#000000");for(var c=0,u=[{rx:"10.5",ry:"5.25002273"},{rx:"10.5",ry:"5.25002273"},{rx:"9.5",ry:"4.77275007"},{rx:"8.5",ry:"4.29549936"},{rx:"7.5",ry:"3.81822308"},{rx:"6.5",ry:"3.34094679"},{rx:"5.5",ry:"2.86367051"},{rx:"4.5",ry:"2.38636864"}];c<u.length;c+=1){var h=u[c],p=i.createNS("http://www.w3.org/2000/svg","ellipse");p.setAttributeNS(null,"opacity","0.04"),p.setAttributeNS(null,"cx","10.5"),p.setAttributeNS(null,"cy","5.80029008"),p.setAttributeNS(null,"rx",h.rx),p.setAttributeNS(null,"ry",h.ry),l.appendChild(p);}var d=i.createNS("http://www.w3.org/2000/svg","g");d.setAttributeNS(null,"fill",this._color);var _=i.createNS("http://www.w3.org/2000/svg","path");_.setAttributeNS(null,"d","M27,13.5 C27,19.074644 20.250001,27.000002 14.75,34.500002 C14.016665,35.500004 12.983335,35.500004 12.25,34.500002 C6.7499993,27.000002 0,19.222562 0,13.5 C0,6.0441559 6.0441559,0 13.5,0 C20.955844,0 27,6.0441559 27,13.5 Z"),d.appendChild(_);var f=i.createNS("http://www.w3.org/2000/svg","g");f.setAttributeNS(null,"opacity","0.25"),f.setAttributeNS(null,"fill","#000000");var m=i.createNS("http://www.w3.org/2000/svg","path");m.setAttributeNS(null,"d","M13.5,0 C6.0441559,0 0,6.0441559 0,13.5 C0,19.222562 6.7499993,27 12.25,34.5 C13,35.522727 14.016664,35.500004 14.75,34.5 C20.250001,27 27,19.074644 27,13.5 C27,6.0441559 20.955844,0 13.5,0 Z M13.5,1 C20.415404,1 26,6.584596 26,13.5 C26,15.898657 24.495584,19.181431 22.220703,22.738281 C19.945823,26.295132 16.705119,30.142167 13.943359,33.908203 C13.743445,34.180814 13.612715,34.322738 13.5,34.441406 C13.387285,34.322738 13.256555,34.180814 13.056641,33.908203 C10.284481,30.127985 7.4148684,26.314159 5.015625,22.773438 C2.6163816,19.232715 1,15.953538 1,13.5 C1,6.584596 6.584596,1 13.5,1 Z"),f.appendChild(m);var g=i.createNS("http://www.w3.org/2000/svg","g");g.setAttributeNS(null,"transform","translate(6.0, 7.0)"),g.setAttributeNS(null,"fill","#FFFFFF");var v=i.createNS("http://www.w3.org/2000/svg","g");v.setAttributeNS(null,"transform","translate(8.0, 8.0)");var y=i.createNS("http://www.w3.org/2000/svg","circle");y.setAttributeNS(null,"fill","#000000"),y.setAttributeNS(null,"opacity","0.25"),y.setAttributeNS(null,"cx","5.5"),y.setAttributeNS(null,"cy","5.5"),y.setAttributeNS(null,"r","5.4999962");var x=i.createNS("http://www.w3.org/2000/svg","circle");x.setAttributeNS(null,"fill","#FFFFFF"),x.setAttributeNS(null,"cx","5.5"),x.setAttributeNS(null,"cy","5.5"),x.setAttributeNS(null,"r","5.4999962"),v.appendChild(y),v.appendChild(x),s.appendChild(l),s.appendChild(d),s.appendChild(f),s.appendChild(g),s.appendChild(v),a.appendChild(s),this._element.appendChild(a),this._offset=t.Point.convert(o&&o.offset||[0,-14]);}this._element.classList.add("mapboxgl-marker"),this._element.addEventListener("dragstart",(function(t){t.preventDefault();})),Go(this._element,this._anchor,"marker"),this._popup=null;}return e&&(o.__proto__=e),o.prototype=Object.create(e&&e.prototype),o.prototype.constructor=o,o.prototype.addTo=function(t){return this.remove(),this._map=t,t.getCanvasContainer().appendChild(this._element),t.on("move",this._update),t.on("moveend",this._update),this.setDraggable(this._draggable),this._update(),this._map.on("click",this._onMapClick),this},o.prototype.remove=function(){return this._map&&(this._map.off("click",this._onMapClick),this._map.off("move",this._update),this._map.off("moveend",this._update),this._map.off("mousedown",this._addDragHandler),this._map.off("touchstart",this._addDragHandler),this._map.off("mouseup",this._onUp),this._map.off("touchend",this._onUp),this._map.off("mousemove",this._onMove),this._map.off("touchmove",this._onMove),delete this._map),i.remove(this._element),this._popup&&this._popup.remove(),this},o.prototype.getLngLat=function(){return this._lngLat},o.prototype.setLngLat=function(e){return this._lngLat=t.LngLat.convert(e),this._pos=null,this._popup&&this._popup.setLngLat(this._lngLat),this._update(),this},o.prototype.getElement=function(){return this._element},o.prototype.setPopup=function(t){if(this._popup&&(this._popup.remove(),this._popup=null),t){if(!("offset"in t.options)){var e=Math.sqrt(Math.pow(13.5,2)/2);t.options.offset=this._defaultMarker?{top:[0,0],"top-left":[0,0],"top-right":[0,0],bottom:[0,-38.1],"bottom-left":[e,-1*(24.6+e)],"bottom-right":[-e,-1*(24.6+e)],left:[13.5,-24.6],right:[-13.5,-24.6]}:this._offset;}this._popup=t,this._lngLat&&this._popup.setLngLat(this._lngLat);}return this},o.prototype._onMapClick=function(t){var e=t.originalEvent.target,i=this._element;this._popup&&(e===i||i.contains(e))&&this.togglePopup();},o.prototype.getPopup=function(){return this._popup},o.prototype.togglePopup=function(){var t=this._popup;return t?(t.isOpen()?t.remove():t.addTo(this._map),this):this},o.prototype._update=function(t){this._map&&(this._map.transform.renderWorldCopies&&(this._lngLat=qo(this._lngLat,this._pos,this._map.transform)),this._pos=this._map.project(this._lngLat)._add(this._offset),t&&"moveend"!==t.type||(this._pos=this._pos.round()),i.setTransform(this._element,jo[this._anchor]+" translate("+this._pos.x+"px, "+this._pos.y+"px)"));},o.prototype.getOffset=function(){return this._offset},o.prototype.setOffset=function(e){return this._offset=t.Point.convert(e),this._update(),this},o.prototype._onMove=function(e){this._pos=e.point.sub(this._positionDelta),this._lngLat=this._map.unproject(this._pos),this.setLngLat(this._lngLat),this._element.style.pointerEvents="none","pending"===this._state&&(this._state="active",this.fire(new t.Event("dragstart"))),this.fire(new t.Event("drag"));},o.prototype._onUp=function(){this._element.style.pointerEvents="auto",this._positionDelta=null,this._map.off("mousemove",this._onMove),this._map.off("touchmove",this._onMove),"active"===this._state&&this.fire(new t.Event("dragend")),this._state="inactive";},o.prototype._addDragHandler=function(t){this._element.contains(t.originalEvent.target)&&(t.preventDefault(),this._positionDelta=t.point.sub(this._pos).add(this._offset),this._state="pending",this._map.on("mousemove",this._onMove),this._map.on("touchmove",this._onMove),this._map.once("mouseup",this._onUp),this._map.once("touchend",this._onUp));},o.prototype.setDraggable=function(t){return this._draggable=!!t,this._map&&(t?(this._map.on("mousedown",this._addDragHandler),this._map.on("touchstart",this._addDragHandler)):(this._map.off("mousedown",this._addDragHandler),this._map.off("touchstart",this._addDragHandler))),this},o.prototype.isDraggable=function(){return this._draggable},o}(t.Evented),Ho={positionOptions:{enableHighAccuracy:!1,maximumAge:0,timeout:6e3},fitBoundsOptions:{maxZoom:15},trackUserLocation:!1,showUserLocation:!0};var Ko=function(e){function o(i){e.call(this),this.options=t.extend({},Ho,i),t.bindAll(["_onSuccess","_onError","_finish","_setupUI","_updateCamera","_updateMarker"],this);}return e&&(o.__proto__=e),o.prototype=Object.create(e&&e.prototype),o.prototype.constructor=o,o.prototype.onAdd=function(e){var o;return this._map=e,this._container=i.create("div","mapboxgl-ctrl mapboxgl-ctrl-group"),o=this._setupUI,void 0!==Wo?o(Wo):void 0!==t.window.navigator.permissions?t.window.navigator.permissions.query({name:"geolocation"}).then((function(t){Wo="denied"!==t.state,o(Wo);})):(Wo=!!t.window.navigator.geolocation,o(Wo)),this._container},o.prototype.onRemove=function(){void 0!==this._geolocationWatchID&&(t.window.navigator.geolocation.clearWatch(this._geolocationWatchID),this._geolocationWatchID=void 0),this.options.showUserLocation&&this._userLocationDotMarker&&this._userLocationDotMarker.remove(),i.remove(this._container),this._map=void 0;},o.prototype._onSuccess=function(e){if(this.options.trackUserLocation)switch(this._lastKnownPosition=e,this._watchState){case"WAITING_ACTIVE":case"ACTIVE_LOCK":case"ACTIVE_ERROR":this._watchState="ACTIVE_LOCK",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active-error"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active");break;case"BACKGROUND":case"BACKGROUND_ERROR":this._watchState="BACKGROUND",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background-error"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-background");}this.options.showUserLocation&&"OFF"!==this._watchState&&this._updateMarker(e),this.options.trackUserLocation&&"ACTIVE_LOCK"!==this._watchState||this._updateCamera(e),this.options.showUserLocation&&this._dotElement.classList.remove("mapboxgl-user-location-dot-stale"),this.fire(new t.Event("geolocate",e)),this._finish();},o.prototype._updateCamera=function(e){var i=new t.LngLat(e.coords.longitude,e.coords.latitude),o=e.coords.accuracy,r=this._map.getBearing(),a=t.extend({bearing:r},this.options.fitBoundsOptions);this._map.fitBounds(i.toBounds(o),a,{geolocateSource:!0});},o.prototype._updateMarker=function(t){t?this._userLocationDotMarker.setLngLat([t.coords.longitude,t.coords.latitude]).addTo(this._map):this._userLocationDotMarker.remove();},o.prototype._onError=function(e){if(this.options.trackUserLocation)if(1===e.code)this._watchState="OFF",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active-error"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background-error"),void 0!==this._geolocationWatchID&&this._clearWatch();else switch(this._watchState){case"WAITING_ACTIVE":this._watchState="ACTIVE_ERROR",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active-error");break;case"ACTIVE_LOCK":this._watchState="ACTIVE_ERROR",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active-error"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting");break;case"BACKGROUND":this._watchState="BACKGROUND_ERROR",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-background-error"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting");}"OFF"!==this._watchState&&this.options.showUserLocation&&this._dotElement.classList.add("mapboxgl-user-location-dot-stale"),this.fire(new t.Event("error",e)),this._finish();},o.prototype._finish=function(){this._timeoutId&&clearTimeout(this._timeoutId),this._timeoutId=void 0;},o.prototype._setupUI=function(e){var o=this;!1!==e?(this._container.addEventListener("contextmenu",(function(t){return t.preventDefault()})),this._geolocateButton=i.create("button","mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate",this._container),this._geolocateButton.type="button",this._geolocateButton.title="Find my location",this._geolocateButton.setAttribute("aria-label","Find my location"),this.options.trackUserLocation&&(this._geolocateButton.setAttribute("aria-pressed","false"),this._watchState="OFF"),this.options.showUserLocation&&(this._dotElement=i.create("div","mapboxgl-user-location-dot"),this._userLocationDotMarker=new Xo(this._dotElement),this.options.trackUserLocation&&(this._watchState="OFF")),this._geolocateButton.addEventListener("click",this.trigger.bind(this)),this._setup=!0,this.options.trackUserLocation&&this._map.on("movestart",(function(e){var i=e.originalEvent&&"resize"===e.originalEvent.type;e.geolocateSource||"ACTIVE_LOCK"!==o._watchState||i||(o._watchState="BACKGROUND",o._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-background"),o._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active"),o.fire(new t.Event("trackuserlocationend")));}))):t.warnOnce("Geolocation support is not available, the GeolocateControl will not be visible.");},o.prototype.trigger=function(){if(!this._setup)return t.warnOnce("Geolocate control triggered before added to a map"),!1;if(this.options.trackUserLocation){switch(this._watchState){case"OFF":this._watchState="WAITING_ACTIVE",this.fire(new t.Event("trackuserlocationstart"));break;case"WAITING_ACTIVE":case"ACTIVE_LOCK":case"ACTIVE_ERROR":case"BACKGROUND_ERROR":this._watchState="OFF",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-active-error"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background"),this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background-error"),this.fire(new t.Event("trackuserlocationend"));break;case"BACKGROUND":this._watchState="ACTIVE_LOCK",this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-background"),this._lastKnownPosition&&this._updateCamera(this._lastKnownPosition),this.fire(new t.Event("trackuserlocationstart"));}switch(this._watchState){case"WAITING_ACTIVE":this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active");break;case"ACTIVE_LOCK":this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active");break;case"ACTIVE_ERROR":this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-active-error");break;case"BACKGROUND":this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-background");break;case"BACKGROUND_ERROR":this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-background-error");}"OFF"===this._watchState&&void 0!==this._geolocationWatchID?this._clearWatch():void 0===this._geolocationWatchID&&(this._geolocateButton.classList.add("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.setAttribute("aria-pressed","true"),this._geolocationWatchID=t.window.navigator.geolocation.watchPosition(this._onSuccess,this._onError,this.options.positionOptions));}else t.window.navigator.geolocation.getCurrentPosition(this._onSuccess,this._onError,this.options.positionOptions),this._timeoutId=setTimeout(this._finish,1e4);return !0},o.prototype._clearWatch=function(){t.window.navigator.geolocation.clearWatch(this._geolocationWatchID),this._geolocationWatchID=void 0,this._geolocateButton.classList.remove("mapboxgl-ctrl-geolocate-waiting"),this._geolocateButton.setAttribute("aria-pressed","false"),this.options.showUserLocation&&this._updateMarker(null);},o}(t.Evented),Jo={maxWidth:100,unit:"metric"},Yo=function(e){this.options=t.extend({},Jo,e),t.bindAll(["_onMove","setUnit"],this);};function Qo(t,e,i){var o,r,a,n,s,l,c=i&&i.maxWidth||100,u=t._container.clientHeight/2,h=(o=t.unproject([0,u]),r=t.unproject([c,u]),a=Math.PI/180,n=o.lat*a,s=r.lat*a,l=Math.sin(n)*Math.sin(s)+Math.cos(n)*Math.cos(s)*Math.cos((r.lng-o.lng)*a),6371e3*Math.acos(Math.min(l,1)));if(i&&"imperial"===i.unit){var p=3.2808*h;if(p>5280)$o(e,c,p/5280,"mi");else $o(e,c,p,"ft");}else if(i&&"nautical"===i.unit){$o(e,c,h/1852,"nm");}else $o(e,c,h,"m");}function $o(t,e,i,o){var r,a,n,s=(r=i,a=Math.pow(10,(""+Math.floor(r)).length-1),n=(n=r/a)>=10?10:n>=5?5:n>=3?3:n>=2?2:n>=1?1:function(t){var e=Math.pow(10,Math.ceil(-Math.log(t)/Math.LN10));return Math.round(t*e)/e}(n),a*n),l=s/i;"m"===o&&s>=1e3&&(s/=1e3,o="km"),t.style.width=e*l+"px",t.innerHTML=s+o;}Yo.prototype.getDefaultPosition=function(){return "bottom-left"},Yo.prototype._onMove=function(){Qo(this._map,this._container,this.options);},Yo.prototype.onAdd=function(t){return this._map=t,this._container=i.create("div","mapboxgl-ctrl mapboxgl-ctrl-scale",t.getContainer()),this._map.on("move",this._onMove),this._onMove(),this._container},Yo.prototype.onRemove=function(){i.remove(this._container),this._map.off("move",this._onMove),this._map=void 0;},Yo.prototype.setUnit=function(t){this.options.unit=t,Qo(this._map,this._container,this.options);};var tr=function(e){this._fullscreen=!1,e&&e.container&&(e.container instanceof t.window.HTMLElement?this._container=e.container:t.warnOnce("Full screen control 'container' must be a DOM element.")),t.bindAll(["_onClickFullscreen","_changeIcon"],this),"onfullscreenchange"in t.window.document?this._fullscreenchange="fullscreenchange":"onmozfullscreenchange"in t.window.document?this._fullscreenchange="mozfullscreenchange":"onwebkitfullscreenchange"in t.window.document?this._fullscreenchange="webkitfullscreenchange":"onmsfullscreenchange"in t.window.document&&(this._fullscreenchange="MSFullscreenChange"),this._className="mapboxgl-ctrl";};tr.prototype.onAdd=function(e){return this._map=e,this._container||(this._container=this._map.getContainer()),this._controlContainer=i.create("div",this._className+" mapboxgl-ctrl-group"),this._checkFullscreenSupport()?this._setupUI():(this._controlContainer.style.display="none",t.warnOnce("This device does not support fullscreen mode.")),this._controlContainer},tr.prototype.onRemove=function(){i.remove(this._controlContainer),this._map=null,t.window.document.removeEventListener(this._fullscreenchange,this._changeIcon);},tr.prototype._checkFullscreenSupport=function(){return !!(t.window.document.fullscreenEnabled||t.window.document.mozFullScreenEnabled||t.window.document.msFullscreenEnabled||t.window.document.webkitFullscreenEnabled)},tr.prototype._setupUI=function(){(this._fullscreenButton=i.create("button",this._className+"-icon "+this._className+"-fullscreen",this._controlContainer)).type="button",this._updateTitle(),this._fullscreenButton.addEventListener("click",this._onClickFullscreen),t.window.document.addEventListener(this._fullscreenchange,this._changeIcon);},tr.prototype._updateTitle=function(){var t=this._isFullscreen()?"Exit fullscreen":"Enter fullscreen";this._fullscreenButton.setAttribute("aria-label",t),this._fullscreenButton.title=t;},tr.prototype._isFullscreen=function(){return this._fullscreen},tr.prototype._changeIcon=function(){(t.window.document.fullscreenElement||t.window.document.mozFullScreenElement||t.window.document.webkitFullscreenElement||t.window.document.msFullscreenElement)===this._container!==this._fullscreen&&(this._fullscreen=!this._fullscreen,this._fullscreenButton.classList.toggle(this._className+"-shrink"),this._fullscreenButton.classList.toggle(this._className+"-fullscreen"),this._updateTitle());},tr.prototype._onClickFullscreen=function(){this._isFullscreen()?t.window.document.exitFullscreen?t.window.document.exitFullscreen():t.window.document.mozCancelFullScreen?t.window.document.mozCancelFullScreen():t.window.document.msExitFullscreen?t.window.document.msExitFullscreen():t.window.document.webkitCancelFullScreen&&t.window.document.webkitCancelFullScreen():this._container.requestFullscreen?this._container.requestFullscreen():this._container.mozRequestFullScreen?this._container.mozRequestFullScreen():this._container.msRequestFullscreen?this._container.msRequestFullscreen():this._container.webkitRequestFullscreen&&this._container.webkitRequestFullscreen();};var er={closeButton:!0,closeOnClick:!0,className:"",maxWidth:"240px"},ir=function(e){function o(i){e.call(this),this.options=t.extend(Object.create(er),i),t.bindAll(["_update","_onClickClose","remove"],this);}return e&&(o.__proto__=e),o.prototype=Object.create(e&&e.prototype),o.prototype.constructor=o,o.prototype.addTo=function(e){var i=this;return this._map=e,this.options.closeOnClick&&this._map.on("click",this._onClickClose),this._map.on("remove",this.remove),this._update(),this._trackPointer?(this._map.on("mousemove",(function(t){i._update(t.point);})),this._map.on("mouseup",(function(t){i._update(t.point);})),this._container&&this._container.classList.add("mapboxgl-popup-track-pointer"),this._map._canvasContainer.classList.add("mapboxgl-track-pointer")):this._map.on("move",this._update),this.fire(new t.Event("open")),this},o.prototype.isOpen=function(){return !!this._map},o.prototype.remove=function(){return this._content&&i.remove(this._content),this._container&&(i.remove(this._container),delete this._container),this._map&&(this._map.off("move",this._update),this._map.off("click",this._onClickClose),this._map.off("remove",this.remove),this._map.off("mousemove"),delete this._map),this.fire(new t.Event("close")),this},o.prototype.getLngLat=function(){return this._lngLat},o.prototype.setLngLat=function(e){return this._lngLat=t.LngLat.convert(e),this._pos=null,this._trackPointer=!1,this._update(),this._map&&(this._map.on("move",this._update),this._map.off("mousemove"),this._container&&this._container.classList.remove("mapboxgl-popup-track-pointer"),this._map._canvasContainer.classList.remove("mapboxgl-track-pointer")),this},o.prototype.trackPointer=function(){var t=this;return this._trackPointer=!0,this._pos=null,this._update(),this._map&&(this._map.off("move",this._update),this._map.on("mousemove",(function(e){t._update(e.point);})),this._map.on("drag",(function(e){t._update(e.point);})),this._container&&this._container.classList.add("mapboxgl-popup-track-pointer"),this._map._canvasContainer.classList.add("mapboxgl-track-pointer")),this},o.prototype.getElement=function(){return this._container},o.prototype.setText=function(e){return this.setDOMContent(t.window.document.createTextNode(e))},o.prototype.setHTML=function(e){var i,o=t.window.document.createDocumentFragment(),r=t.window.document.createElement("body");for(r.innerHTML=e;i=r.firstChild;)o.appendChild(i);return this.setDOMContent(o)},o.prototype.getMaxWidth=function(){return this._container.style.maxWidth},o.prototype.setMaxWidth=function(t){return this.options.maxWidth=t,this._update(),this},o.prototype.setDOMContent=function(t){return this._createContent(),this._content.appendChild(t),this._update(),this},o.prototype._createContent=function(){this._content&&i.remove(this._content),this._content=i.create("div","mapboxgl-popup-content",this._container),this.options.closeButton&&(this._closeButton=i.create("button","mapboxgl-popup-close-button",this._content),this._closeButton.type="button",this._closeButton.setAttribute("aria-label","Close popup"),this._closeButton.innerHTML="&#215;",this._closeButton.addEventListener("click",this._onClickClose));},o.prototype._update=function(e){var o=this,r=this._lngLat||this._trackPointer;if(this._map&&r&&this._content&&(this._container||(this._container=i.create("div","mapboxgl-popup",this._map.getContainer()),this._tip=i.create("div","mapboxgl-popup-tip",this._container),this._container.appendChild(this._content),this.options.className&&this.options.className.split(" ").forEach((function(t){return o._container.classList.add(t)})),this._trackPointer&&this._container.classList.add("mapboxgl-popup-track-pointer")),this.options.maxWidth&&this._container.style.maxWidth!==this.options.maxWidth&&(this._container.style.maxWidth=this.options.maxWidth),this._map.transform.renderWorldCopies&&!this._trackPointer&&(this._lngLat=qo(this._lngLat,this._pos,this._map.transform)),!this._trackPointer||e)){var a=this._pos=this._trackPointer&&e?e:this._map.project(this._lngLat),n=this.options.anchor,s=function e(i){if(i){if("number"==typeof i){var o=Math.round(Math.sqrt(.5*Math.pow(i,2)));return {center:new t.Point(0,0),top:new t.Point(0,i),"top-left":new t.Point(o,o),"top-right":new t.Point(-o,o),bottom:new t.Point(0,-i),"bottom-left":new t.Point(o,-o),"bottom-right":new t.Point(-o,-o),left:new t.Point(i,0),right:new t.Point(-i,0)}}if(i instanceof t.Point||Array.isArray(i)){var r=t.Point.convert(i);return {center:r,top:r,"top-left":r,"top-right":r,bottom:r,"bottom-left":r,"bottom-right":r,left:r,right:r}}return {center:t.Point.convert(i.center||[0,0]),top:t.Point.convert(i.top||[0,0]),"top-left":t.Point.convert(i["top-left"]||[0,0]),"top-right":t.Point.convert(i["top-right"]||[0,0]),bottom:t.Point.convert(i.bottom||[0,0]),"bottom-left":t.Point.convert(i["bottom-left"]||[0,0]),"bottom-right":t.Point.convert(i["bottom-right"]||[0,0]),left:t.Point.convert(i.left||[0,0]),right:t.Point.convert(i.right||[0,0])}}return e(new t.Point(0,0))}(this.options.offset);if(!n){var l,c=this._container.offsetWidth,u=this._container.offsetHeight;l=a.y+s.bottom.y<u?["top"]:a.y>this._map.transform.height-u?["bottom"]:[],a.x<c/2?l.push("left"):a.x>this._map.transform.width-c/2&&l.push("right"),n=0===l.length?"bottom":l.join("-");}var h=a.add(s[n]).round();i.setTransform(this._container,jo[n]+" translate("+h.x+"px,"+h.y+"px)"),Go(this._container,n,"popup");}},o.prototype._onClickClose=function(){this.remove();},o}(t.Evented);var or={version:t.version,supported:e,setRTLTextPlugin:t.setRTLTextPlugin,Map:Uo,NavigationControl:Vo,GeolocateControl:Ko,AttributionControl:Ro,ScaleControl:Yo,FullscreenControl:tr,Popup:ir,Marker:Xo,Style:Fe,LngLat:t.LngLat,LngLatBounds:t.LngLatBounds,Point:t.Point,MercatorCoordinate:t.MercatorCoordinate,Evented:t.Evented,config:t.config,get accessToken(){return t.config.ACCESS_TOKEN},set accessToken(e){t.config.ACCESS_TOKEN=e;},get baseApiUrl(){return t.config.API_URL},set baseApiUrl(e){t.config.API_URL=e;},get workerCount(){return At.workerCount},set workerCount(t){At.workerCount=t;},get maxParallelImageRequests(){return t.config.MAX_PARALLEL_IMAGE_REQUESTS},set maxParallelImageRequests(e){t.config.MAX_PARALLEL_IMAGE_REQUESTS=e;},clearStorage:function(e){t.clearTileCache(e);},workerUrl:""};return or}));

  //

  return mapboxgl;

  }));
  //# sourceMappingURL=mapbox-gl.js.map
  });

  const template = document.createElement('template');
  template.innerHTML = `<style>
:host(){
    position: relative;
}
#map-container{
    width:100%;
    height:100%;
}

slot[name=placeholder]{
    position: absolute;
    display:flex;
    align-items:center;
    justify-content:center;
    width:100%;
    height:100%;
    z-index:3;
}
</style>
<slot name="placeholder">Loading...</slot>
<div id="map-container"></div>
<slot name="sources"></slot>
<slot name="layers"></slot>
`;

  const EMPTY_GEOJSON_SOURCE_DATA = Object.freeze({
      type: 'FeatureCollection',
      features: []
  });

  const template$1 = document.createElement('template');
  template$1.innerHTML = `<slot name="layers"></slot>`;

  const expressionTest = /^\d|^\[|^true|^false/;

  const parse = string => {
      if (expressionTest.test(string)) {
          return JSON.parse(string.replace(/'/g, '"'));
      }

      //normal string
      return string;
  };

  const stringify = val => typeof val === 'string' ? val : JSON
      .stringify(val)
      .replace(/"/g, '\'');

  const instanceToLayerProperties = instance => (acc, prop) => {
      if ((prop.defaultValue !== void 0) || (instance[kebabToCamel(prop.name)] !== null)) {
          acc[prop.name] = instance[kebabToCamel(prop.name)];
      }
      return acc;
  };

  const kebabToCamel = prop => prop
      .split('-')
      .map((word, index) => {
          if (index === 0)
              return word;

          const [first, ...rest] = word;

          return first.toUpperCase() + rest.join('');
      })
      .join('');

  const layerEventsList = [
      'mouseup',
      'click',
      'dblclick',
      'mousemove',
      'mouseenter',
      'mouseleave',
      'mouseover',
      'mouseout',
      'contextmenu',
      'touchstart',
      'touchend',
      'touchcancel'
  ];

  const layerFactory = (layoutProperties, paintProperties, layerType) => {

      const klass = class extends HTMLElement {
          static get observedAttributes() {
              return [...paintProperties, ...layoutProperties]
                  .map(({name}) => name);
          }

          get filter() {
              return parse(this.getAttribute('filter'));
          }

          set filter(value) {
              this.setAttribute('filter', stringify(value));
          }

          attributeChangedCallback(name, oldValue, newValue) {
              if (this._map) {
                  if (paintProperties.some(p => p.name === name)) {
                      this._map.setPaintProperty(this.layerId, name, parse(newValue));
                  } else if (layoutProperties.some(p => p.name === name)) {
                      this._map.setLayoutProperty(this.layerId, name, parse(newValue));
                  }
              }
          }

          set map(value) {
              if (value !== this._map) {
                  this._map = value;
                  const setProps = instanceToLayerProperties(this);
                  const paint = paintProperties.reduce(setProps, {});
                  const layout = layoutProperties.reduce(setProps, {});
                  const spec = {
                      type: layerType,
                      id: this.layerId,
                      paint,
                      layout
                  };

                  if (this.source) {
                      spec.source = this.source;
                  }

                  if (this.sourceLayer) {
                      spec['source-layer'] = this.sourceLayer;
                  }

                  if (this.filter) {
                      spec.filter = this.filter;
                  }

                  this._map.addLayer(spec);

                  let listener;

                  while (listener = this._listenersQueue.shift()) {
                      this._map.on(listener[0], this.layerId, listener[1]);
                  }

              }
          }

          get layerId() {
              return this.getAttribute('layer-id');
          }

          get source() {
              return this.getAttribute('source');
          }

          get sourceLayer() {
              return this.getAttribute('source-layer');
          }

          constructor() {
              super();
              this._listenersQueue = [];
          }

          connectedCallback() {
              this.setAttribute('slot', 'layers');
          }

          disconnectedCallback() {
              if (this._map) {
                  this._map.removeLayer(this.layerId);
              }
          }

          addEventListener(type, listener, options) {
              if (layerEventsList.includes(type)) {
                  if (this._map) {
                      this._map.on(type, this.layerId, listener);
                  } else {
                      this._listenersQueue.push([type, listener]);
                  }
              } else {
                  super.addEventListener(type, listener, options);
              }
          }

          removeEventListener(type, listener, options) {
              if (layerEventsList.includes(type)) {
                  this._map.off(type, this.layerId, listener);
              } else {
                  super.removeEventListener(type, listener, options);
              }
          }
      };

      for (const p of [...layoutProperties, ...paintProperties]) {
          Object.defineProperty(klass.prototype, kebabToCamel(p.name), {
              enumarable: true,
              get() {
                  const attributeValue = parse(this.getAttribute(p.name));
                  return p.defaultValue !== void 0 ? (
                          this.hasAttribute(p.name) ? attributeValue :
                              p.defaultValue) :
                      attributeValue;
              },
              set(value) {
                  this.setAttribute(p.name, stringify(value));
              }
          });
      }

      return klass;
  };

  const LAYOUT_PROPERTIES = [
      {name: 'circle-sort-key'},
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES = [
      {name: 'circle-color', defaultValue: '#000000'},
      {name: 'circle-radius', defaultValue: 5},
      {name: 'circle-stroke-width', defaultValue: 0},
      {name: 'circle-stroke-color', defaultValue: '#000000'},
      {name: 'circle-opacity', defaultValue: 1},
      {name: 'circle-blur', defaultValue: 0},
      {name: 'circle-translate', defaultValue: [0, 0]},
      {name: 'circle-translate-anchor', defaultValue: 'map'},
      {name: 'circle-pitch-scale', defaultValue: 'map'},
      {name: 'circle-pitch-alignment', defaultValue: 'viewport'}
  ];


  const CircleLayer = layerFactory(LAYOUT_PROPERTIES, PAINT_PROPERTIES, 'circle');

  const LAYOUT_PROPERTIES$1 = [
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$1 = [
      {name: 'background-color', defaultValue: '#000000'},
      {name: 'background-pattern'},
      {name: 'background-opacity', defaultValue: 1}
  ];

  const BackgroundLayer = layerFactory(LAYOUT_PROPERTIES$1, PAINT_PROPERTIES$1, 'background');

  const LAYOUT_PROPERTIES$2 = [
      {name: 'fill-sort-key'},
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$2 = [
      {name: 'fill-antialias', defaultValue: true},
      {name: 'fill-opacity', defaultValue: 1},
      {name: 'fill-color', defaultValue: '#000000'},
      {name: 'fill-outline-color'},
      {name: 'fill-translate', defaultValue: [0, 0]},
      {name: 'fill-translate-anchor', defaultValue: 'map'},
      {name: 'fill-pattern'}
  ];

  const FillLayer = layerFactory(LAYOUT_PROPERTIES$2, PAINT_PROPERTIES$2, 'fill');

  const LAYOUT_PROPERTIES$3 = [
      {name: 'line-cap', defaultValue: 'butt'},
      {name: 'line-join', defaultValue: 'miter'},
      {name: 'line-miter-limit', defaultValue: 2},
      {name: 'line-round-limit', defaultValue: 1.05},
      {name: 'line-sort-key'},
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$3 = [
      {name: 'line-opacity', defaultValue: 1},
      {name: 'line-color', defaultValue: '#000000'},
      {name: 'line-translate', defaultValue: [0, 0]},
      {name: 'line-translate-anchor', defaultValue: 'map'},
      {name: 'line-width', defaultValue: 1},
      {name: 'line-gap-width', defaultValue: 0},
      {name: 'line-offset', defaultValue: 0},
      {name: 'line-blur', defaultValue: 0},
      {name: 'line-dasharray'},
      {name: 'line-pattern'},
      {name: 'line-gradient'}
  ];

  const LineLayer = layerFactory(LAYOUT_PROPERTIES$3, PAINT_PROPERTIES$3, 'line');

  const LAYOUT_PROPERTIES$4 = [
      {name: 'symbol-placement', defaultValue: 'point'},
      {name: 'symbol-spacing', defaultValue: 250},
      {name: 'symbol-avoid-edges', defaultValue: false},
      {name: 'symbol-sort-key'},
      {name: 'symbol-z-order', defaultValue: 'auto'},
      {name: 'icon-allow-overlap', defaultValue: false},
      {name: 'icon-ignore-placement', defaultValue: false},
      {name: 'icon-optional', defaultValue: false},
      {name: 'icon-rotation-alignment', defaultValue: 'auto'},
      {name: 'icon-size', defaultValue: 1},
      {name: 'icon-text-fit', defaultValue: 'none'},
      {name: 'icon-text-fit-padding', defaultValue: [0, 0, 0, 0]},
      {name: 'icon-image'},
      {name: 'icon-rotate', defaultValue: 0},
      {name: 'icon-padding', defaultValue: 2},
      {name: 'icon-keep-upright', defaultValue: false},
      {name: 'icon-offset', defaultValue: [0, 0]},
      {name: 'icon-anchor', defaultValue: 'center'},
      {name: 'icon-pitch-alignment', defaultValue: 'auto'},
      {name: 'text-pitch-alignment', defaultValue: 'auto'},
      {name: 'text-rotation-alignment', defaultValue: 'auto'},
      {name: 'text-field', defaultValue: ''},
      {name: 'text-font', defaultValue: ['Open Sans Regular', 'Arial Unicode MS Regular']},
      {name: 'text-size', defaultValue: 16},
      {name: 'text-max-width', defaultValue: 10},
      {name: 'text-line-height', defaultValue: 1.2},
      {name: 'text-letter-spacing', defaultValue: 0},
      {name: 'text-justify', defaultValue: 'center'},
      {name: 'text-radial-offset', defaultValue: 0},
      {name: 'text-variable-anchor'},
      {name: 'text-anchor', defaultValue: 'center'},
      {name: 'text-max-angle', defaultValue: 45},
      {name: 'text-writing-mode'},
      {name: 'text-rotate', defaultValue: 0},
      {name: 'text-padding', defaultValue: 2},
      {name: 'text-keep-upright', defaultValue: true},
      {name: 'text-transform', defaultValue: 'none'},
      {name: 'text-offset', defaultValue: [0, 0]},
      {name: 'text-allow-overlap', defaultValue: false},
      {name: 'text-ignore-placement', defaultValue: false},
      {name: 'text-optional', defaultValue: false},
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$4 = [
      {name: 'icon-opacity', defaultValue: 1},
      {name: 'icon-color', defaultValue: '#000000'},
      {name: 'icon-halo-color', defaultValue: 'rgba(0,0,0,0)'},
      {name: 'icon-halo-width', defaultValue: 0},
      {name: 'icon-halo-blur', defaultValue: 0},
      {name: 'icon-translate', defaultValue: [0, 0]},
      {name: 'icon-translate-anchor', defaultValue: 'map'},
      {name: 'text-opacity', defaultValue: 1},
      {name: 'text-color', defaultValue: '#000000'},
      {name: 'text-halo-color', defaultValue: 'rgba(0,0,0,0)'},
      {name: 'text-halo-width', defaultValue: 0},
      {name: 'text-halo-blur', defaultValue: 0},
      {name: 'text-translate', defaultValue: [0, 0]},
      {name: 'text-translate-anchor', defaultValue: 'map'}
  ];

  const SymbolLayer = layerFactory(LAYOUT_PROPERTIES$4, PAINT_PROPERTIES$4, 'symbol');

  const LAYOUT_PROPERTIES$5 = [
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$5 = [
      {name: 'raster-opacity', defaultValue: 1},
      {name: 'raster-hue-rotate', defaultValue: 0},
      {name: 'raster-brightness-min', defaultValue: 0},
      {name: 'raster-brightness-max', defaultValue: 1},
      {name: 'raster-saturation', defaultValue: 0},
      {name: 'raster-resampling', defaultValue: 'linear'},
      {name: 'raster-fade-duration', defaultValue: 300}
  ];

  const RasterLayer = layerFactory(LAYOUT_PROPERTIES$5, PAINT_PROPERTIES$5, 'raster');

  const LAYOUT_PROPERTIES$6 = [
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$6 = [
      {name: 'fill-extrusion-opacity', defaultValue: 1},
      {name: 'fill-extrusion-color', defaultValue: '#000000'},
      {name: 'fill-extrusion-translate', defaultValue: [0, 0]},
      {name: 'fill-extrusion-translate-anchor', defaultValue: 'map'},
      {name: 'fill-extrusion-pattern'},
      {name: 'fill-extrusion-height', defaultValue: 0},
      {name: 'fill-extrusion-base', defaultValue: 0},
      {name: 'fill-extrusion-vertical-gradient', defaultValue: true}
  ];

  const FillExtrusionLayer = layerFactory(LAYOUT_PROPERTIES$6, PAINT_PROPERTIES$6, 'fill-extrusion');

  const LAYOUT_PROPERTIES$7 = [
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$7 = [
      {name: 'heatmap-radius', defaultValue: 30},
      {name: 'heatmap-weight', defaultValue: 1},
      {name: 'heatmap-intensity', defaultValue: 1},
      {
          name: 'heatmap-color',
          defaultValue: ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0, 0, 255, 0)', 0.1, 'royalblue', 0.3, 'cyan', 0.5, 'lime', 0.7, 'yellow', 1, 'red']
      },
      {name: 'heatmap-opacity', defaultValue: 1}
  ];

  const HeatmapLayer = layerFactory(LAYOUT_PROPERTIES$7, PAINT_PROPERTIES$7, 'heatmap');

  const LAYOUT_PROPERTIES$8 = [
      {name: 'visibility', defaultValue: 'visible'}
  ];

  const PAINT_PROPERTIES$8 = [
      {name: 'hillshade-illumination-direction', defaultValue: 335},
      {name: 'hillshade-illumination-anchor', defaultValue: 'viewport'},
      {name: 'hillshade-exaggeration', defaultValue: 0.5},
      {name: 'hillshade-shadow-color', defaultValue: '#000000'},
      {name: 'hillshade-highlight-color', defaultValue: '#FFFFFF'},
      {name: 'hillshade-accent-color', defaultValue: '#000000'}
  ];

  const HillshadeLayer = layerFactory(LAYOUT_PROPERTIES$8, PAINT_PROPERTIES$8, 'hillshade');

  var View;
  (function (View) {
      View["SEARCH"] = "SEARCH";
      View["SETTINGS"] = "SETTINGS";
      View["ITINERARY"] = "ITINERARY";
      View["LEISURE"] = "LEISURE";
  })(View || (View = {}));
  const defaultState = () => ({
      selectedView: View.SEARCH
  });
  const reducer = (previousState = defaultState(), action) => {
      switch (action.type) {
          case ActionType.SELECT_VIEW:
              return Object.assign({}, previousState, { selectedView: action.view });
          default:
              return previousState;
      }
  };

  // todo compare and do something with ./src/util.js
  const decodeLineString = geometry => {
      const output = Object.assign({}, geometry);
      output.coordinates = decodeLine(geometry.coordinates);
      return output;
  };
  const pointListToFeature = (points) => ({
      type: 'FeatureCollection',
      features: points.map(pointToFeature)
  });
  const pointToFeature = (point) => ({
      type: 'Feature',
      geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
      }
  });

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

  const testStore = (state, extraArgs) => {
      let actions = [];
      const collectActionsMiddleware = store => next => action => {
          actions.push(action);
          return next(action);
      };
      const enhancer = applyMiddleware(thunk.withExtraArgument(extraArgs), collectActionsMiddleware);
      //@ts-ignore
      return Object.assign(createStore(state => state, state, enhancer), {
          getActions() {
              return actions;
          }
      });
  };
  const directionsAPIStub = () => {
      const calls = [];
      let reason = null;
      let resolve = null;
      return Object.defineProperties({
          async search(points) {
              calls.push(points);
              if (reason !== null) {
                  throw reason;
              }
              return resolve;
          },
          resolve(value) {
              resolve = value;
          },
          reject(reasonValue) {
              reason = reasonValue;
          }
      }, {
          calls: {
              get() {
                  return calls;
              }
          }
      });
  };
  const stubFactory = name => () => {
      const calls = [];
      return {
          [name]: (...args) => {
              calls.push(args);
              return args;
          },
          hasBeenCalled(count = 1) {
              return calls.length === count;
          },
          getCall(index = 0) {
              return calls[index];
          }
      };
  };
  const createTestSearchResult = (lng, lat) => ({
      type: 'lng_lat',
      lng,
      lat
  });
  const wait = (time = 100) => new Promise(resolve => {
      setTimeout(() => resolve(), time);
  });

  const mock = {
      'routes': [
          {
              'geometry': '_kdlCdp`vN{JgNzOmNnHcGJ_@cDoBwC{Bp@m@VB~BzB~BoB{EsGf@a@',
              'legs': [
                  {
                      'summary': '',
                      'weight': 485.1,
                      'duration': 425.7,
                      'steps': [],
                      'distance': 1617.8
                  }
              ],
              'weight_name': 'cyclability',
              'weight': 485.1,
              'duration': 425.7,
              'distance': 1617.8
          },
          {
              'geometry': '_kdlCdp`vNxHaHdIwGlIyHmLiQqGyIf@a@',
              'legs': [
                  {
                      'summary': '',
                      'weight': 532.3,
                      'duration': 418.3,
                      'steps': [],
                      'distance': 1350.9
                  }
              ],
              'weight_name': 'cyclability',
              'weight': 532.3,
              'duration': 418.3,
              'distance': 1350.9
          },
          {
              'geometry': '_kdlCdp`vNuRqXaBsBzRoPMQC[BMNKVDpAjB`@R^K~BoBVB~BzB~BoB{EsGf@a@',
              'legs': [
                  {
                      'summary': '',
                      'weight': 521.8,
                      'duration': 448.3,
                      'steps': [],
                      'distance': 1759.4
                  }
              ],
              'weight_name': 'cyclability',
              'weight': 521.8,
              'duration': 448.3,
              'distance': 1759.4
          }
      ],
      'waypoints': [
          {
              'distance': 0,
              'name': '1ra Avenida',
              'location': [
                  -82.419388,
                  23.128963
              ]
          },
          {
              'distance': 16.11451552639027,
              'name': 'Calle 26',
              'location': [
                  -82.410138,
                  23.127413
              ]
          }
      ],
      'code': 'Ok',
      'uuid': 'cjy5yo9tz00og3xmwil3pzmht'
  };
  const wait$1 = (time = 200) => new Promise(resolve => {
      setTimeout(() => resolve(), time);
  });
  const factory = (args) => {
      return {
          async search(points) {
              await wait$1();
              return mock.routes;
          }
      };
  };

  const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';
  const factory$1 = ({ endpoint = DEFAULT_ENDPOINT_ROOT } = { endpoint: DEFAULT_ENDPOINT_ROOT }) => {
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

  const DEFAULT_ENDPOINT_ROOT$1 = 'https://api.citykleta-test.com';
  const factory$2 = ({ endpoint = DEFAULT_ENDPOINT_ROOT$1 } = { endpoint: DEFAULT_ENDPOINT_ROOT$1 }) => {
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

  const defaultState$1 = () => ({
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
  const reducer$1 = (previousState = defaultState$1(), action) => {
      switch (action.type) {
          case ActionType.RESET_ROUTES: {
              return Object.assign({}, defaultState$1());
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

  var Theme;
  (function (Theme) {
      Theme["LIGHT"] = "LIGHT";
      Theme["DARK"] = "DARK";
  })(Theme || (Theme = {}));
  const defaultState$2 = () => ({
      theme: Theme.LIGHT
  });
  const reducer$2 = (previousState = defaultState$2(), action) => {
      switch (action.type) {
          case ActionType.CHANGE_THEME:
              return Object.assign({}, previousState, {
                  theme: action.theme
              });
          default:
              return previousState;
      }
  };

  const defaultState$3 = () => ({
      searchResult: [],
      isSearching: false,
      selectedSearchResult: null
  });
  const reducer$3 = (previousState = defaultState$3(), action) => {
      switch (action.type) {
          case ActionType.FETCH_POINTS_OF_INTEREST:
          case ActionType.FETCH_SEARCH_RESULT:
          case ActionType.FETCH_CLOSEST: {
              return Object.assign({}, previousState, {
                  searchResult: [],
                  isSearching: true,
                  selectedSearchResult: null
              });
          }
          case ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS:
          case ActionType.FETCH_CLOSEST_SUCCESS:
          case ActionType.FETCH_SEARCH_RESULT_SUCCESS:
              const { result: searchResult } = action;
              const selectedSearchResult = searchResult.length === 1 ? searchResult[0] : null;
              return Object.assign({}, previousState, {
                  searchResult: searchResult.map((s, i) => Object.assign(s, {
                      id: i
                  })),
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

  var mapBoxConf = Object.freeze({
      accessToken: '<@MAPBOX_PUBLIC_TOKEN@>',
      style: '<@MAP_STYLE@>',
      center: [-82.367408, 23.122419],
      zoom: 12.4,
      minZoom: 11,
      doubleClickZoom: false,
      logoPosition: 'bottom-right'
  });

  const defaultState$4 = () => ({
      zoom: mapBoxConf.zoom,
      center: mapBoxConf.center
  });
  const reducer$4 = (previousState = defaultState$4(), action) => {
      switch (action.type) {
          case ActionType.UPDATE_MAP:
              const { type, ...rest } = action;
              const newState = Object.assign({}, previousState, rest);
              newState.zoom = truncate(newState.zoom, 2);
              newState.center = newState.center.map(v => truncate(v, 6));
              return newState;
          default:
              return previousState;
      }
  };

  const defaultState$5 = () => ({
      routes: [],
      isSearching: false,
      selectedRouteId: null
  });
  const reducer$5 = (previousState = defaultState$5(), action) => {
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
      endpoint: '<@API_ENDPOINT@>'
  });

  const createReducer = (reducers) => {
      const combined = combineReducers(reducers);
      return (state = defaultState$6, action) => {
          if (action.type === ActionType.CHANGE_HISTORY_POINT) {
              return action.state;
          }
          return combined(state, action);
      };
  };

  const defaultState$6 = () => ({
      navigation: defaultState(),
      itinerary: defaultState$1(),
      search: defaultState$3(),
      settings: defaultState$2(),
      map: defaultState$4(),
      leisure: defaultState$5()
  });
  const defaultAPI = {
      directions:  factory() ,
      geocoder: factory$1({
          endpoint: apiConf.endpoint
      }),
      leisure: factory$2({
          endpoint: apiConf.endpoint
      })
  };
  // placeholder for dynamically injected reducers
  const passThroughReducer = (state = {}) => state;
  const store = (api = defaultAPI) => (initialState = defaultState$6()) => {
      const staticReducer = {
          navigation: reducer,
          map: passThroughReducer,
          itinerary: passThroughReducer,
          settings: passThroughReducer,
          search: passThroughReducer,
          leisure: passThroughReducer
      };
      // @ts-ignore
      const store = createStore(createReducer(staticReducer), initialState, applyMiddleware(thunk.withExtraArgument(api)
      // debugMiddleware
      ));
      const dynamicReducers = {};
      // @ts-ignore
      return Object.assign(store, {
          injectReducer(key, reducer) {
              dynamicReducers[key] = reducer;
              store.replaceReducer(createReducer(Object.assign({}, staticReducer, dynamicReducers)));
          }
      });
  };

  const setState = (state) => ({
      ...defaultState$6(),
      itinerary: state
  });
  var itineraryAction = (a) => {
      const { test, skip } = a;
      test('create an ADD_ITINERARY_ACTION without specifying the "before" item', t => {
          const expected = {
              type: ActionType.ADD_ITINERARY_POINT,
              point: createTestSearchResult(-82.396679, 23.115898),
              beforeId: null
          };
          t.eq(addItineraryPoint(createTestSearchResult(-82.396679, 23.115898)), expected);
      });
      test('create an create an ADD_ITINERARY_ACTION specifying the "before" item', t => {
          const expected = {
              type: ActionType.ADD_ITINERARY_POINT,
              point: createTestSearchResult(-82.396679, 23.115898),
              beforeId: 666
          };
          t.eq(addItineraryPoint(createTestSearchResult(-82.396679, 23.115898), 666), expected);
      });
      test('create a REMOVE_ITINERARY_POINT action', t => {
          const expected = {
              type: ActionType.REMOVE_ITINERARY_POINT,
              id: 66
          };
          t.eq(removeItineraryPoint(66), expected);
      });
      test('create a UPDATE_ITINERARY_POINT action', t => {
          const expected = {
              type: ActionType.UPDATE_ITINERARY_POINT,
              id: 42,
              location: createTestSearchResult(-82.396679, 23.115898)
          };
          t.eq(updateItineraryPoint(42, createTestSearchResult(-82.396679, 23.115898)), expected);
      });
      test('create a MOVE_ITINERARY_POINT action (insert after)', t => {
          const expected = {
              type: ActionType.MOVE_ITINERARY_POINT,
              sourceId: 2,
              targetId: 4,
              position: InsertionPosition.AFTER
          };
          t.eq(moveItineraryPoint(2, 4, InsertionPosition.AFTER), expected);
      });
      test('create a MOVE_ITINERARY_POINT action (insert before)', t => {
          const expected = {
              type: ActionType.MOVE_ITINERARY_POINT,
              sourceId: 2,
              targetId: 5,
              position: InsertionPosition.BEFORE
          };
          t.eq(moveItineraryPoint(2, 5, InsertionPosition.BEFORE), expected);
      });
      test('create a FETCH_ROUTES action', t => {
          const expected = {
              type: ActionType.FETCH_ROUTES
          };
          t.eq(fetchRoutes(), expected);
      });
      test('create a FETCH_ROUTES_SUCCESS action', t => {
          const expected = {
              type: ActionType.FETCH_ROUTES_SUCCESS,
              routes: [{
                      geometry: 'foo',
                      distance: 1234,
                      duration: 4321
                  }]
          };
          t.eq(fetchRoutesWithSuccess([{
                  geometry: 'foo',
                  distance: 1234,
                  duration: 4321
              }]), expected);
      });
      test('create a FETCH_ROUTES_SUCCESS action', t => {
          const expected = {
              type: ActionType.FETCH_ROUTES_SUCCESS,
              routes: [{
                      geometry: 'foo',
                      distance: 1234,
                      duration: 4321
                  }]
          };
          t.eq(fetchRoutesWithSuccess([{
                  geometry: 'foo', distance: 1234,
                  duration: 4321
              }]), expected);
      });
      test('create a FETCH_ROUTES_FAILURE action', t => {
          const error = new Error('some error');
          const expected = {
              type: ActionType.FETCH_ROUTES_FAILURE,
              error
          };
          t.eq(fetchRoutesWithFailure(error), expected);
      });
      test('create a RESET_ROUTES action', t => {
          const actual = resetRoutes();
          t.eq(actual, { type: ActionType.RESET_ROUTES });
      });
      test('create a FETCH_ROUTES action thunk: successful request', async (t) => {
          // given
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'whatever',
                  distance: 1234,
                  duration: 4321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(1234, 4321) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(fetchRoutesFromAPI());
          // expectations
          t.eq(sdkMock.calls.length, 1, 'should have been called once');
          t.eq(sdkMock.calls[0], [{ lng: 1234, lat: 4321 }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the arguments');
          t.eq(store.getActions(), [{
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'whatever',
                          distance: 1234,
                          duration: 4321
                      }]
              }]);
      });
      test('create a FETCH_ROUTES action thunk: errored request', async (t) => {
          // given
          const error = new Error('something went wrong');
          const sdkMock = directionsAPIStub();
          sdkMock.reject(error);
          const store = testStore(setState({
              stops: [{ id: 1, item: createTestSearchResult(1234, 4321) }, {
                      id: 2,
                      item: createTestSearchResult(4321, 1234)
                  }],
              routes: [],
              selectedRoute: 0
          }), { directions: sdkMock });
          //@ts-ignore
          await store.dispatch(fetchRoutesFromAPI());
          //expectations
          t.eq(store.getActions(), [{
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_FAILURE,
                  error
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have been called once');
          t.eq(sdkMock.calls[0], [{ lng: 1234, lat: 4321 }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the arguments');
      });
      test('add itinerary point with side effects should not have side effect if there is less than 2 stops', async (t) => {
          // given
          const sdkMock = directionsAPIStub();
          const store = testStore(setState({
              stops: [{ id: 1, item: createTestSearchResult(666, 666) }],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          // @ts-ignore
          await store.dispatch(addItineraryPointWithSideEffects({
              lng: 4321,
              lat: 1234
          }));
          t.eq(store.getActions(), [{
                  type: ActionType.ADD_ITINERARY_POINT,
                  point: {
                      lng: 4321,
                      lat: 1234
                  },
                  beforeId: null
              }], 'should only dispatched the ADD_ITINERARY_ACTION');
          t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
      });
      test('add itinerary point with side effects should trigger side effects if there is at least 2 points', async (t) => {
          // given a fake store
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(addItineraryPointWithSideEffects(createTestSearchResult(4321, 1234)));
          t.eq(store.getActions(), [{
                  type: ActionType.ADD_ITINERARY_POINT,
                  point: createTestSearchResult(4321, 1234),
                  beforeId: null
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('move itinerary point before with side effects should trigger side effects', async (t) => {
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
          t.eq(store.getActions(), [{
                  type: ActionType.MOVE_ITINERARY_POINT,
                  sourceId: 2,
                  targetId: 1,
                  position: InsertionPosition.BEFORE
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('move itinerary point after with side effects should trigger side effects', async (t) => {
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(moveItineraryPointWithSideEffects(1, 2, InsertionPosition.AFTER));
          t.eq(store.getActions(), [{
                  type: ActionType.MOVE_ITINERARY_POINT,
                  sourceId: 1,
                  targetId: 2,
                  position: InsertionPosition.AFTER
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('remove itinerary point with side effects should not have side effect if there is less than 2 stops', async (t) => {
          // given
          const sdkMock = directionsAPIStub();
          const store = testStore(setState({
              stops: [{ id: 1, item: createTestSearchResult(666, 666) }],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          // @ts-ignore
          await store.dispatch(removeItineraryPointWithSideEffects(3));
          t.eq(store.getActions(), [{
                  type: ActionType.REMOVE_ITINERARY_POINT,
                  id: 3
              }], 'should only dispatched the ADD_ITINERARY_ACTION');
          t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
      });
      test('remove itinerary point with side effects should trigger side effects if there is at least 2 points', async (t) => {
          // given a fake store
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(removeItineraryPointWithSideEffects(3));
          t.eq(store.getActions(), [{
                  type: ActionType.REMOVE_ITINERARY_POINT,
                  id: 3
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('change itinerary point location with side effects should not have side effect if there is less than 2 stops', async (t) => {
          // given
          const sdkMock = directionsAPIStub();
          const store = testStore(setState({
              stops: [{ id: 1, item: createTestSearchResult(666, 666) }],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          // @ts-ignore
          await store.dispatch(updateItineraryPoint(1, { lng: 666, lat: 666 }));
          t.eq(store.getActions(), [{
                  type: ActionType.UPDATE_ITINERARY_POINT,
                  id: 1,
                  location: { lng: 666, lat: 666 }
              }], 'should only dispatched the ADD_ITINERARY_ACTION');
          t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
      });
      test('change itinerary point location with side effects should trigger side effects if there is at least 2 points', async (t) => {
          // given a fake store
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(changeItineraryPointWithSideEffects(1, { type: 'lng_lat', lng: 666, lat: 666 }));
          t.eq(store.getActions(), [{
                  type: ActionType.UPDATE_ITINERARY_POINT,
                  id: 1,
                  location: {
                      type: 'lng_lat',
                      lng: 666,
                      lat: 666
                  }
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('create MOVE_ITINERARY_POINT action', t => {
          const action = moveItineraryPoint(3, 5, InsertionPosition.AFTER);
          t.eq(action, {
              type: ActionType.MOVE_ITINERARY_POINT,
              sourceId: 3,
              targetId: 5,
              position: InsertionPosition.AFTER
          });
      });
      test('move itinerary point with side effects should trigger side effects when there are at least two points', async (t) => {
          // given a fake store
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: createTestSearchResult(666, 666) },
                  { id: 2, item: createTestSearchResult(4321, 1234) }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
          t.eq(store.getActions(), [{
                  type: ActionType.MOVE_ITINERARY_POINT,
                  sourceId: 2,
                  targetId: 1,
                  position: InsertionPosition.BEFORE
              }, {
                  type: ActionType.FETCH_ROUTES
              }, {
                  type: ActionType.FETCH_ROUTES_SUCCESS,
                  routes: [{
                          geometry: 'geometry',
                          duration: 12345,
                          distance: 54321
                      }]
              }]);
          t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
          t.eq(sdkMock.calls[0], [{
                  lng: 666,
                  lat: 666
              }, {
                  lng: 4321,
                  lat: 1234
              }], 'should have forwarded the stop points lists');
      });
      test('move itinerary point with side effects should not trigger side effects when there is only one point', async (t) => {
          // given a fake store
          const sdkMock = directionsAPIStub();
          sdkMock.resolve([{
                  geometry: 'geometry',
                  duration: 12345,
                  distance: 54321
              }]);
          const store = testStore(setState({
              stops: [
                  { id: 1, item: null },
                  { id: 2, item: { type: 'lng_lat', lng: 4321, lat: 1234 } }
              ],
              routes: [],
              selectedRoute: 0
          }), {
              directions: sdkMock
          });
          //@ts-ignore
          await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
          t.eq(store.getActions(), [{
                  type: ActionType.MOVE_ITINERARY_POINT,
                  sourceId: 2,
                  targetId: 1,
                  position: InsertionPosition.BEFORE
              }]);
          t.eq(sdkMock.calls.length, 0, 'should not have fetched routes');
      });
      test('go to action: should create a goTo action', t => {
          t.eq(goTo(createTestSearchResult(12345, 54321)), {
              type: ActionType.GO_TO,
              location: createTestSearchResult(12345, 54321)
          });
      });
      test('go from action: should create a goFrom action', t => {
          t.eq(goFrom(createTestSearchResult(12345, 54321)), {
              type: ActionType.GO_FROM,
              location: createTestSearchResult(12345, 54321)
          });
      });
      test(`selectRoute should create a ${ActionType.SELECT_ROUTE} action`, t => {
          t.eq(selectRoute(4), {
              type: ActionType.SELECT_ROUTE,
              route: 4
          });
      });
  };

  const selectView = (view) => ({
      type: ActionType.SELECT_VIEW,
      view
  });

  const createInitalState = (...stops) => ({
      stops,
      routes: [],
      selectedRoute: 0
  });
  var itineraryReducer = ({ test }) => {
      test('should return the previous state if action is not related to itinerary', t => {
          const initialState = createInitalState(createTestSearchResult(1234, 4321));
          const actual = reducer$1(initialState, selectView(View.ITINERARY));
          t.eq(actual, initialState, 'state should not have changed');
      });
      test('add a point without specifying the insertion position', t => {
          const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
          const actual = reducer$1(initialState, addItineraryPoint(createTestSearchResult(789, 987)));
          t.eq(actual, {
              stops: [{
                      item: createTestSearchResult(1234, 4321),
                      id: 2
                  }, {
                      item: createTestSearchResult(789, 987),
                      id: 3
                  }],
              routes: [],
              selectedRoute: 0
          });
      });
      test('add a point specifying a valid insertion position', t => {
          const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
          const actual = reducer$1(initialState, addItineraryPoint({
              type: 'lng_lat',
              lng: 789,
              lat: 987,
          }, 2));
          t.eq(actual, {
              stops: [{
                      id: 3, item: createTestSearchResult(789, 987)
                  }, {
                      item: createTestSearchResult(1234, 4321),
                      id: 2
                  }],
              routes: [],
              selectedRoute: 0
          });
      });
      test('change an existing point coordinates', t => {
          const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
          const actual = reducer$1(initialState, updateItineraryPoint(2, createTestSearchResult(789, 987)));
          t.eq(actual, {
              stops: [{
                      id: 2,
                      item: createTestSearchResult(789, 987)
                  }],
              routes: [],
              selectedRoute: 0
          });
      });
      test('change a non existing point coordinates: should not modify state', t => {
          const initialState = createInitalState(createTestSearchResult(1234, 4321));
          const actual = reducer$1(initialState, updateItineraryPoint(666, {
              type: 'lng_lat',
              lng: 789,
              lat: 987
          }));
          t.eq(actual, initialState);
      });
      test('remove an existing point', t => {
          const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
          const actual = reducer$1(initialState, removeItineraryPoint(2));
          t.eq(actual, { stops: [], routes: [], selectedRoute: 0 });
      });
      test('remove a non existing point', t => {
          const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
          const actual = reducer$1(initialState, removeItineraryPoint(666));
          t.eq(actual, initialState);
      });
      test('move point should not do anything if target sourceId does not match any', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(2, 666, InsertionPosition.AFTER));
          t.eq(actual.stops, stops);
      });
      test('move point should not do anything if source sourceId does not match any', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(666, 3, InsertionPosition.BEFORE));
          t.eq(actual.stops, stops);
      });
      test('move before existing itinerary points from higher index to lower index', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(4, 3, InsertionPosition.BEFORE));
          t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
      });
      test('move before existing itinerary points from lower index to higher index', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(2, 4, InsertionPosition.BEFORE));
          t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
      });
      test('move after existing itinerary points from higher index to lower index', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(4, 2, InsertionPosition.AFTER));
          t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
      });
      test('move after existing itinerary points from lower index to higher index', t => {
          const stops = [{
                  id: 2,
                  item: createTestSearchResult(22, 33)
              }, {
                  id: 3,
                  item: createTestSearchResult(44, 55)
              }, {
                  id: 4,
                  item: createTestSearchResult(55, 66)
              }];
          const initialState = createInitalState(...stops);
          const actual = reducer$1(initialState, moveItineraryPoint(2, 3, InsertionPosition.AFTER));
          t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
      });
      test('reset routes and stop points', t => {
          const initialState = Object.assign(createInitalState({ id: 3, item: createTestSearchResult(1234, 4321) }), {
              routes: [{ geometry: 'bar' }],
              selectedRoute: 0
          });
          const actual = reducer$1(initialState, resetRoutes());
          t.eq(actual, {
              routes: [],
              stops: [{
                      id: 0,
                      item: null
                  }, {
                      id: 1,
                      item: null
                  }],
              selectedRoute: 0
          });
      });
      test('set routes', t => {
          const initialState = Object.assign({}, createInitalState({ id: 1, item: createTestSearchResult(1234, 4321) }), {
              selectedRoute: 3
          });
          const actual = reducer$1(initialState, fetchRoutesWithSuccess([{
                  geometry: 'geom',
                  duration: 3453,
                  distance: 2323
              }]));
          t.eq(actual.stops, [{
                  id: 1, item: createTestSearchResult(1234, 4321)
              }], 'should have let the stops untouched');
          t.eq(actual.routes, [{
                  geometry: 'geom',
                  duration: 3453,
                  distance: 2323
              }], 'should have set the new routes');
          t.eq(actual.selectedRoute, 0, 'should have re initialized the selected route');
      });
      test('respond to a GO_TO action, should set the stops state', t => {
          const initialState = createInitalState(createTestSearchResult(1234, 4321), createTestSearchResult(5678, 8765));
          t.eq(reducer$1(initialState, goTo(createTestSearchResult(6666, 7777))), {
              stops: [{
                      id: 0,
                      item: null
                  }, {
                      id: 1,
                      item: createTestSearchResult(6666, 7777)
                  }],
              routes: [],
              selectedRoute: 0
          });
      });
      test('respond to a GO_FROM action, should set the stops state', t => {
          const initialState = createInitalState(createTestSearchResult(1234, 4321), createTestSearchResult(5678, 8765));
          t.eq(reducer$1(initialState, goFrom(createTestSearchResult(6666, 7777))), {
              stops: [{
                      id: 0,
                      item: createTestSearchResult(6666, 7777)
                  }, {
                      id: 1,
                      item: null
                  }],
              routes: [],
              selectedRoute: 0
          });
      });
      test(`respond to a ${ActionType.SELECT_ROUTE} action with a valid index should select the route`, t => {
          const initialState = Object.assign(createInitalState(), {
              routes: [{
                      geometry: 'route1',
                      duration: 1234,
                      distance: 4321
                  }, {
                      geometry: 'route2',
                      duration: 6789,
                      distance: 9876
                  }],
              selectedRoute: 1
          });
          const actual = reducer$1(initialState, selectRoute(0));
          t.eq(actual.routes, initialState.routes, 'routes part of the state should be left untouched');
          t.eq(actual.selectedRoute, 0, 'should have changed the selectedRoute');
      });
      test(`respond to a ${ActionType.SELECT_ROUTE} action with an invalid index should keep the currently selected route`, t => {
          const initialState = Object.assign(createInitalState(), {
              routes: [{
                      geometry: 'route1',
                      duration: 1234,
                      distance: 4321
                  }, {
                      geometry: 'route2',
                      duration: 6789,
                      distance: 9876
                  }],
              selectedRoute: 1
          });
          const actual = reducer$1(initialState, selectRoute(2));
          t.eq(actual.routes, initialState.routes, 'routes part of the state should be left untouched');
          t.eq(actual.selectedRoute, 1, 'should have kept the selected route');
      });
  };

  const changeTheme = (theme) => ({
      type: ActionType.CHANGE_THEME,
      theme
  });

  var settingsAction = ({ test }) => {
      test('create a CHANGE_THEME action', t => {
          t.eq(changeTheme(Theme.DARK), {
              type: ActionType.CHANGE_THEME,
              theme: Theme.DARK
          });
      });
  };

  var settingsReducer = ({ test }) => {
      test('should return state is if the action type is different than CHANGE_THEME', t => {
          const actual = reducer$2({ theme: Theme.LIGHT }, addItineraryPoint({
              type: 'lng_lat',
              lng: 2323,
              lat: 23432
          }));
          t.eq(actual, { theme: Theme.LIGHT }, 'should return the same state');
      });
      test('should return state with the new selected theme', t => {
          const actual = reducer$2({ theme: Theme.LIGHT }, changeTheme(Theme.DARK));
          t.eq(actual, { theme: Theme.DARK }, 'should hve changed the theme');
      });
  };

  const fetchPointsOfInterest = (query) => ({
      type: ActionType.FETCH_POINTS_OF_INTEREST,
      query
  });
  const fetchPointsOfInterestWithSuccess = (result) => ({
      type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
      result
  });
  const fetchPointsOfInterestWithFailure = (error) => ({
      type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
      error
  });
  const fetchPointsOfInterestFromAPI = (query) => async (dispatch, getState, API) => {
      const { geocoder } = API;
      dispatch(fetchPointsOfInterest(query));
      try {
          const res = await geocoder.searchPointsOfInterest(query);
          return dispatch(fetchPointsOfInterestWithSuccess(res));
      }
      catch (e) {
          return dispatch(fetchPointsOfInterestWithFailure(e));
      }
  };
  const fetchSearchResult = (query) => ({
      type: ActionType.FETCH_SEARCH_RESULT,
      query
  });
  const fetchSearchResultWithSuccess = (result) => ({
      type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
      result
  });
  const fetchSearchResultWithFailure = (error) => ({
      type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
      error
  });
  const fetchSearchResultFromAPI = (query) => async (dispatch, getState, API) => {
      const { geocoder } = API;
      dispatch(fetchSearchResult(query));
      try {
          const res = await geocoder.searchAddress(query);
          return dispatch(fetchSearchResultWithSuccess(res));
      }
      catch (e) {
          return dispatch(fetchSearchResultWithFailure(e));
      }
  };
  const selectSearchResult = (result) => ({
      type: ActionType.SELECT_SEARCH_RESULT,
      searchResult: result
  });
  const fetchClosest = (location) => ({
      type: ActionType.FETCH_CLOSEST,
      location
  });
  const fetchClosestWithSuccess = (result) => ({
      type: ActionType.FETCH_CLOSEST_SUCCESS,
      result
  });
  const fetchClosestWithFailure = (error) => ({
      type: ActionType.FETCH_CLOSEST_FAILURE,
      error
  });
  const fetchClosestFromAPI = (location) => async (dispatch, getState, API) => {
      const { geocoder } = API;
      dispatch(fetchClosest(location));
      try {
          const res = await geocoder.reverse(location);
          return dispatch(fetchClosestWithSuccess(res));
      }
      catch (e) {
          return dispatch(fetchClosestWithFailure(e));
      }
  };

  var searchAction = (a) => {
      const { test } = a;
      const skip = a.skip.bind(a);
      test('create a FETCH_POINTS_OF_INTEREST action', t => {
          t.eq(fetchPointsOfInterest('don cangrejo'), {
              type: ActionType.FETCH_POINTS_OF_INTEREST,
              query: 'don cangrejo'
          });
      });
      test('create a FETCH_POINTS_OF_INTEREST_SUCCESS action', t => {
          const pointOfInterest = {
              type: 'point_of_interest',
              name: 'foo',
              geometry: {
                  type: 'Point',
                  coordinates: [1234, 4321]
              },
              address: {},
              category: 'bar',
          };
          t.eq(fetchPointsOfInterestWithSuccess([pointOfInterest]), {
              type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
              result: [pointOfInterest]
          });
      });
      test('create a FETCH_POINTS_OF_INTEREST_FAILURE action', t => {
          t.eq(fetchPointsOfInterestWithFailure('some error'), {
              type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
              error: 'some error'
          });
      });
      test('fetch pointsOfInterest from API when API returns pointsOfInterest', async (t) => {
          const actions = [];
          const thunk = fetchPointsOfInterestFromAPI('revolucion');
          const suggestionsStub = [{
                  type: 'point_of_interest',
                  name: 'foo',
                  geometry: {
                      type: 'Point',
                      coordinates: [1234, 4321]
                  },
                  address: {},
                  category: 'bar',
              }];
          const fakeDispatch = a => actions.push(a);
          const fakeGeocoder = {
              async searchPointsOfInterest(query) {
                  return suggestionsStub;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeocoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_POINTS_OF_INTEREST,
                  query: 'revolucion'
              }, {
                  type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
                  result: suggestionsStub
              }]);
      });
      test('fetch pointsOfInterest from API when API fails', async (t) => {
          const actions = [];
          const thunk = fetchPointsOfInterestFromAPI('revolucion');
          const fakeDispatch = a => actions.push(a);
          const error = new Error('oh no!');
          const fakeGeocoder = {
              async searchPointsOfInterest(query) {
                  throw error;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeocoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_POINTS_OF_INTEREST,
                  query: 'revolucion'
              }, {
                  type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
                  error
              }]);
      });
      test('fetch search result: should create a FETCH_SEARCH_RESULT action', t => {
          t.eq(fetchSearchResult('some query'), {
              type: ActionType.FETCH_SEARCH_RESULT,
              query: 'some query'
          });
      });
      test('fetch search result with success: should return a FETCH_SEARCH_RESULT_WITH_SUCCESS action', t => {
          t.eq(fetchSearchResultWithSuccess([
              { type: 'lng_lat', lng: 1234, lat: 5432 }
          ]), {
              type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
              result: [
                  { type: 'lng_lat', lng: 1234, lat: 5432 }
              ]
          });
      });
      test('fetch search result with failure: should return a FETCH_SEARCH_RESULT_WITH_FAILURE action', t => {
          t.eq(fetchSearchResultWithFailure({ message: 'oops' }), {
              type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
              error: { message: 'oops' }
          });
      });
      test('fetch search result from api when api succeed', async (t) => {
          const actions = [];
          const thunk = fetchSearchResultFromAPI('hello');
          const fakeDispatch = a => actions.push(a);
          const stubResult = [{
                  type: 'corner',
                  streets: ['1ra', '10'],
                  geometry: {
                      type: 'Point',
                      coordinates: [123, 543]
                  }
              }];
          const fakeGeocoder = {
              async searchAddress(query) {
                  return stubResult;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeocoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_SEARCH_RESULT,
                  query: 'hello'
              }, {
                  type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
                  result: stubResult
              }]);
      });
      test('fetch search result from api when api fails', async (t) => {
          const actions = [];
          const thunk = fetchSearchResultFromAPI('hello');
          const fakeDispatch = a => actions.push(a);
          const error = new Error('oops something is wrong');
          const fakeGeocoder = {
              async searchAddress(query) {
                  throw error;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeocoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_SEARCH_RESULT,
                  query: 'hello'
              }, {
                  type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
                  error
              }]);
      });
      test('create a SELECT_SEARCH_RESULT action', t => {
          const searchResult = { type: 'lng_lat', lng: 1234, lat: 5432 };
          t.eq(selectSearchResult(searchResult), {
              type: ActionType.SELECT_SEARCH_RESULT,
              searchResult
          });
      });
      test('create a FETCH_CLOSEST action', t => {
          const location = {
              lng: 222,
              lat: 333
          };
          t.eq(fetchClosest(location), {
              type: ActionType.FETCH_CLOSEST,
              location
          });
      });
      test('fetch closest location with success', t => {
          const searchResults = [createTestSearchResult(1234, 4321), createTestSearchResult(23234, 53232)];
          t.eq(fetchClosestWithSuccess(searchResults), {
              type: ActionType.FETCH_CLOSEST_SUCCESS,
              result: searchResults
          });
      });
      test('fetch closest location with failure', t => {
          const error = new Error('something went wrong');
          t.eq(fetchClosestWithFailure(error), {
              type: ActionType.FETCH_CLOSEST_FAILURE,
              error
          });
      });
      test('fetch closest from api when api succeed', async (t) => {
          const actions = [];
          const location = { lng: 1234, lat: 4321 };
          const thunk = fetchClosestFromAPI(location);
          const fakeDispatch = a => actions.push(a);
          const stubResult = [createTestSearchResult(234, 432), createTestSearchResult(765, 456)];
          const fakeGeoCoder = {
              async reverse(locationQuery) {
                  if (locationQuery !== location) {
                      throw new Error('unexpected argument');
                  }
                  return stubResult;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeoCoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_CLOSEST,
                  location
              }, {
                  type: ActionType.FETCH_CLOSEST_SUCCESS,
                  result: stubResult
              }]);
      });
      test('fetch closest from api when api succeed', async (t) => {
          const actions = [];
          const location = { lng: 1234, lat: 4321 };
          const error = new Error('something went wrong');
          const thunk = fetchClosestFromAPI(location);
          const fakeDispatch = a => actions.push(a);
          const fakeGeoCoder = {
              async reverse(locationQuery) {
                  if (locationQuery !== location) {
                      throw new Error('unexpected argument');
                  }
                  throw error;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              // @ts-ignore
              geocoder: fakeGeoCoder
          });
          t.eq(actions, [{
                  type: ActionType.FETCH_CLOSEST,
                  location
              }, {
                  type: ActionType.FETCH_CLOSEST_FAILURE,
                  error
              }]);
      });
  };

  var searchReducer = (assert) => {
      const { test } = assert;
      const skip = assert.skip.bind(assert);
      test('should return state is if the action type is not related to search', t => {
          const initialState = defaultState$3();
          const actual = reducer$3(initialState, addItineraryPoint({
              type: 'lng_lat',
              lng: 5432,
              lat: 1234
          }));
          t.eq(actual, initialState, 'should return the same state');
      });
      test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST} action should turn the search state into search mode`, t => {
          const initialState = Object.assign(defaultState$3(), {
              searchResult: [createTestSearchResult(1234, 5432)]
          });
          const actual = reducer$3(initialState, fetchPointsOfInterest('foo'));
          t.eq(actual, { isSearching: true, searchResult: [], selectedSearchResult: null });
      });
      test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS} action, should change the pointsOfInterest part of the search state`, t => {
          const initialState = Object.assign(defaultState$3(), { isSearching: true });
          const pointsOfInterest = [{
                  type: 'point_of_interest',
                  name: 'foo',
                  geometry: {
                      type: 'Point',
                      coordinates: [5432, 1234]
                  },
                  category: 'bar',
                  address: {},
                  municipality: 'playa'
              }, {
                  type: 'point_of_interest',
                  name: 'bodeguita',
                  geometry: {
                      type: 'Point',
                      coordinates: [754, 344]
                  },
                  category: 'bar',
                  address: {},
                  municipality: 'habana vieja'
              }];
          const actual = reducer$3(initialState, fetchPointsOfInterestWithSuccess(pointsOfInterest));
          t.eq(actual, {
              searchResult: pointsOfInterest,
              selectedSearchResult: null,
              isSearching: false
          });
      });
      test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS} action, should automatically select the item if there is only one result`, t => {
          const initialState = defaultState$3();
          const pointsOfInterest = [{
                  type: 'point_of_interest',
                  name: 'foo',
                  geometry: {
                      type: 'Point',
                      coordinates: [5432, 1234]
                  },
                  category: 'bar',
                  address: {},
                  municipality: 'playa'
              }];
          const actual = reducer$3(initialState, fetchPointsOfInterestWithSuccess(pointsOfInterest));
          t.eq(actual, {
              searchResult: pointsOfInterest,
              selectedSearchResult: pointsOfInterest[0],
              isSearching: false
          });
      });
      test(`responding to ${ActionType.SELECT_SEARCH_RESULT} action, should change the selectedSearchResult part of the state`, t => {
          const searchResult = [{ type: 'lng_lat', lng: 5432, lat: 1234 }];
          const initialState = Object.assign(defaultState$3(), {
              searchResult
          });
          t.eq(reducer$3(initialState, selectSearchResult(searchResult[0])), {
              searchResult,
              isSearching: false,
              selectedSearchResult: searchResult[0]
          });
      });
      test('responding to FETCH_SEARCH_RESULT action', t => {
          const searchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
          const initialState = Object.assign(defaultState$3(), {
              searchResult,
              selectedSearchResult: searchResult[0]
          });
          t.eq(reducer$3(initialState, fetchSearchResult('hello')), {
              searchResult: [],
              selectedSearchResult: null,
              isSearching: true
          });
      });
      test(`responding to ${ActionType.FETCH_SEARCH_RESULT_SUCCESS} action, should update the searchResult part`, t => {
          const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          const newSearchResult = [
              createTestSearchResult(5678, 8765),
              createTestSearchResult(23425, 25242)
          ];
          t.eq(reducer$3(initialState, fetchSearchResultWithSuccess(newSearchResult)), {
              isSearching: false,
              searchResult: newSearchResult,
              selectedSearchResult: null
          });
      });
      test(`responding to ${ActionType.FETCH_SEARCH_RESULT_SUCCESS} action, should automatically select the result if there is only one suggestion`, t => {
          const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          const newSearchResult = [createTestSearchResult(5678, 8765)];
          t.eq(reducer$3(initialState, fetchSearchResultWithSuccess(newSearchResult)), {
              isSearching: false,
              searchResult: newSearchResult,
              selectedSearchResult: newSearchResult[0]
          });
      });
      test('responding to FETCH_SEARCH_RESULT_FAILURE action, should update the searchResult part of the state', t => {
          const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          t.eq(reducer$3(initialState, fetchSearchResultWithFailure({ message: 'something went wrong' })), {
              isSearching: false,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
      });
      test('responding to FETCH_SEARCH_RESULT action, should set the state in searching mode', t => {
          const searchResult = [createTestSearchResult(1234, 4321)];
          const location = createTestSearchResult(46456, 34534);
          const initialState = Object.assign(defaultState$3(), {
              searchResult,
              selectedSearchResult: searchResult[0]
          });
          t.eq(reducer$3(initialState, fetchClosest(location)), {
              searchResult: [],
              selectedSearchResult: null,
              isSearching: true
          });
      });
      test(`responding to ${ActionType.FETCH_CLOSEST_FAILURE} action, should update the searchResult part of the state`, t => {
          const initalSearchResult = [createTestSearchResult(1234, 4321)];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          t.eq(reducer$3(initialState, fetchClosestWithFailure({ message: 'something went wrong' })), {
              isSearching: false,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
      });
      test(`responding to ${ActionType.FETCH_CLOSEST_SUCCESS} action, should update the searchResult part`, t => {
          const initalSearchResult = [createTestSearchResult(1234, 4321)];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          const newSearchResult = [
              createTestSearchResult(5678, 8765),
              createTestSearchResult(7456, 2345)
          ];
          t.eq(reducer$3(initialState, fetchClosestWithSuccess(newSearchResult)), {
              isSearching: false,
              searchResult: newSearchResult,
              selectedSearchResult: null
          });
      });
      test(`responding to ${ActionType.FETCH_CLOSEST_SUCCESS} action, should automatically select the item if there is only one result`, t => {
          const initalSearchResult = [createTestSearchResult(1234, 4321)];
          const initialState = Object.assign(defaultState$3(), {
              isSearching: true,
              searchResult: initalSearchResult,
              selectedSearchResult: initalSearchResult[0]
          });
          const newSearchResult = [
              createTestSearchResult(5678, 8765)
          ];
          t.eq(reducer$3(initialState, fetchClosestWithSuccess(newSearchResult)), {
              isSearching: false,
              searchResult: newSearchResult,
              selectedSearchResult: newSearchResult[0]
          });
      });
  };

  var mapUtil = (a) => {
      const { test } = a;
      test('pointListToFeature should transform a point collection into a valid GeoJSON feature collection', t => {
          const points = [{ lng: 12345, lat: 54321 }, { lng: 7890, lat: 9876 }];
          t.eq(pointListToFeature(points), {
              type: 'FeatureCollection',
              features: [{
                      type: 'Feature',
                      geometry: {
                          type: 'Point',
                          coordinates: [12345, 54321]
                      }
                  }, {
                      type: 'Feature',
                      geometry: {
                          type: 'Point',
                          coordinates: [7890, 9876]
                      }
                  }]
          });
      });
  };

  const updateMapPosition = (position) => {
      const newPosition = {
          type: ActionType.UPDATE_MAP
      };
      if (position.center !== void 0) {
          newPosition.center = position.center;
      }
      if (position.zoom !== void 0) {
          newPosition.zoom = position.zoom;
      }
      return newPosition;
  };

  const searchActions = {
      fetchPointsOfInterestFromAPI,
      fetchPointsOfInterestWithSuccess,
      fetchSearchResultFromAPI,
      fetchSearchResultWithSuccess,
      selectSearchResult,
      fetchClosestFromAPI,
      updateMapPosition
  };
  const provider = (store, { fetchPointsOfInterestFromAPI, fetchPointsOfInterestWithSuccess, fetchSearchResultFromAPI, fetchSearchResultWithSuccess, selectSearchResult, fetchClosestFromAPI, updateMapPosition } = searchActions) => ({
      async searchPointOfInterest(query) {
          return query ? store.dispatch(fetchPointsOfInterestFromAPI(query))
              : store.dispatch(fetchPointsOfInterestWithSuccess([]));
      },
      async searchPointOfInterestNearBy(location) {
          return store.dispatch(fetchClosestFromAPI(location));
      },
      async searchAddress(query) {
          return query ? store.dispatch(fetchSearchResultFromAPI(query))
              : store.dispatch(fetchSearchResultWithSuccess([]));
      },
      selectSearchResult(r) {
          const { lng, lat } = createSearchResultInstance(r).toPoint();
          store.dispatch(selectSearchResult(r));
          store.dispatch(updateMapPosition({
              center: [lng, lat]
          }));
      },
      getSearchResult() {
          return store.getState().search.searchResult;
      }
  });

  const storeFactory = stubFactory('dispatch');
  var searchService = ({ test }) => {
      test(`selectSearchResult should dispatch the result of "selectSearchResult" action`, t => {
          const store = storeFactory();
          const selectSearchResultStub = stubFactory('selectSearchResult')();
          const updateMapPositionStub = stubFactory('updateMapPosition')();
          // @ts-ignore
          const service = provider(store, {
              // @ts-ignore
              selectSearchResult: selectSearchResultStub.selectSearchResult,
              // @ts-ignore
              updateMapPosition: updateMapPositionStub.updateMapPosition
          });
          const searchResult = createTestSearchResult(333, 444);
          service.selectSearchResult(searchResult);
          t.ok(selectSearchResultStub.hasBeenCalled(), 'selectSearchResult action should have been called');
          t.eq(selectSearchResultStub.getCall(), [searchResult], ' should have forwarded the search result argument');
          t.ok(updateMapPositionStub.hasBeenCalled(), 'updateMapPosition action should have been called');
          t.eq(updateMapPositionStub.getCall(), [{
                  center: [333, 444]
              }], ' should have set default center point');
          t.ok(store.hasBeenCalled(2), 'action should have been dispatched');
          t.eq(store.getCall(0), [[searchResult]], 'argument should have been forwarded by the store');
          t.eq(store.getCall(1), [[{
                      center: [333, 444]
                  }]], 'argument should have been forwarded by the store');
      });
      test(`searchAddress with empty query should forward an empty search result and avoid api call`, async (t) => {
          const store = storeFactory();
          const fetchSearchResultWithSuccessStub = stubFactory('fetchSearchResultWithSuccess')();
          const fetchSearchResultFromAPIStub = stubFactory('fetchSearchResultFromAPI')();
          const stub = {
              //@ts-ignore
              fetchSearchResultWithSuccess: fetchSearchResultWithSuccessStub.fetchSearchResultWithSuccess,
              //@ts-ignore
              fetchSearchResultFromAPI: fetchSearchResultFromAPIStub.fetchSearchResultFromAPI
          };
          //@ts-ignore
          const service = provider(store, stub);
          const expectedArgs = [];
          await service.searchAddress('');
          t.notOk(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should not have been called');
          t.ok(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
          t.eq(fetchSearchResultWithSuccessStub.getCall(), [expectedArgs], 'fetchSearchResultWithSuccess should have been called with the empty array');
          t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
          t.eq(store.getCall(), [[expectedArgs]], 'store.dispatch should have been called with the result of fetchSearchResultWithSuccess action');
      });
      test(`searchAddress with valid query should forward the search to the api`, async (t) => {
          const store = storeFactory();
          const fetchSearchResultWithSuccessStub = stubFactory('fetchSearchResultWithSuccess')();
          const fetchSearchResultFromAPIStub = stubFactory('fetchSearchResultFromAPI')();
          const stub = {
              //@ts-ignore
              fetchSearchResultWithSuccess: fetchSearchResultWithSuccessStub.fetchSearchResultWithSuccess,
              //@ts-ignore
              fetchSearchResultFromAPI: fetchSearchResultFromAPIStub.fetchSearchResultFromAPI
          };
          //@ts-ignore
          const service = provider(store, stub);
          const expected = 'foo';
          await service.searchAddress('foo');
          t.ok(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should have been called once');
          t.notOk(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
          t.eq(fetchSearchResultFromAPIStub.getCall(), [expected], 'fetchSearchResultFromAPIS should have been called with the query string');
          t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
          t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchSearchResultFromAPI action');
      });
      test(`searchPointOfInterest with empty query should forward an empty search result and avoid api call`, async (t) => {
          const store = storeFactory();
          const fetchPointsOfInterestWithSuccessStub = stubFactory('fetchPointsOfInterestWithSuccess')();
          const fetchPointsOfInterestFromAPIStub = stubFactory('fetchPointsOfInterestFromAPI')();
          const stub = {
              //@ts-ignore
              fetchPointsOfInterestWithSuccess: fetchPointsOfInterestWithSuccessStub.fetchPointsOfInterestWithSuccess,
              //@ts-ignore
              fetchPointsOfInterestFromAPI: fetchPointsOfInterestFromAPIStub.fetchPointsOfInterestFromAPI
          };
          //@ts-ignore
          const service = provider(store, stub);
          const expected = [];
          await service.searchPointOfInterest('');
          t.notOk(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should not have been called');
          t.ok(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
          t.eq(fetchPointsOfInterestWithSuccessStub.getCall(), [expected], 'fetchSearchResultWithSuccess should have been called with the empty array');
          t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
          t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchPointsOfInterestWithSuccess action');
      });
      test(`searchPointOfInterest with valid query should forward the search to the api`, async (t) => {
          const store = storeFactory();
          const fetchPointsOfInterestWithSuccessStub = stubFactory('fetchPointsOfInterestWithSuccess')();
          const fetchPointsOfInterestFromAPIStub = stubFactory('fetchPointsOfInterestFromAPI')();
          const stub = {
              //@ts-ignore
              fetchPointsOfInterestWithSuccess: fetchPointsOfInterestWithSuccessStub.fetchPointsOfInterestWithSuccess,
              //@ts-ignore
              fetchPointsOfInterestFromAPI: fetchPointsOfInterestFromAPIStub.fetchPointsOfInterestFromAPI
          };
          //@ts-ignore
          const service = provider(store, stub);
          const expected = 'foo';
          await service.searchPointOfInterest('foo');
          t.ok(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should have been called');
          t.notOk(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
          t.eq(fetchPointsOfInterestFromAPIStub.getCall(), [expected], 'fetchPointsOfInterestFromAPI should have been called with the query string');
          t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
          t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchPointsOfInterestFromAPI action');
      });
      test(`searchPointOfInterestNearBy with valid location should forward the search to the api`, async (t) => {
          const store = storeFactory();
          const fetchClosestFromAPIStub = stubFactory('fetchClosestFromAPI')();
          const stub = {
              //@ts-ignore
              fetchClosestFromAPI: fetchClosestFromAPIStub.fetchClosestFromAPI
          };
          //@ts-ignore
          const service = provider(store, stub);
          const location = { lng: 1234, lat: 4321 };
          await service.searchPointOfInterestNearBy(location);
          t.ok(fetchClosestFromAPIStub.hasBeenCalled(), 'api should have been called');
          t.eq(fetchClosestFromAPIStub.getCall(), [location], 'fetchClosestFromAPI should have been called with the provided location');
          t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
          t.eq(store.getCall(), [[location]], 'store.dispatch should have been called with the result of fetchClosestFromAPI action');
      });
  };

  const itineraryActions = {
      moveItineraryPointWithSideEffects,
      addItineraryPointWithSideEffects,
      removeItineraryPointWithSideEffects,
      changeItineraryPointWithSideEffects,
      goTo,
      goFrom,
      resetRoutes,
      selectRoute
  };
  const provider$1 = (store, { moveItineraryPointWithSideEffects, addItineraryPointWithSideEffects, removeItineraryPointWithSideEffects, changeItineraryPointWithSideEffects, goTo, goFrom, resetRoutes, selectRoute } = itineraryActions) => {
      let movingPoint = null;
      return {
          startMove(id) {
              const { stops } = store.getState().itinerary;
              movingPoint = stops
                  .find(i => i.id === id) || null;
          },
          async moveBefore(id) {
              if (movingPoint) {
                  // @ts-ignore
                  store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.BEFORE));
              }
              movingPoint = null;
          },
          async moveAfter(id) {
              if (movingPoint) {
                  // @ts-ignore
                  store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.AFTER));
              }
              movingPoint = null;
          },
          async addPoint(point, beforeId) {
              return store.dispatch(addItineraryPointWithSideEffects(point, beforeId !== undefined ? beforeId : null));
          },
          async removePoint(id) {
              return store.dispatch(removeItineraryPointWithSideEffects(id));
          },
          async updatePoint(id, location) {
              return store.dispatch(changeItineraryPointWithSideEffects(id, location));
          },
          reset() {
              store.dispatch(resetRoutes());
          },
          goTo(location) {
              store.dispatch(goTo(location));
          },
          goFrom(location) {
              store.dispatch(goFrom(location));
          },
          selectRoute(r) {
              store.dispatch(selectRoute(r));
          }
      };
  };

  const storeFactory$1 = stubFactory('dispatch');
  var itineraryService = ({ test }) => {
      test('addPoint - should dispatch addItineraryPointWithSideEffects with no insert position specified', async (t) => {
          const addItineraryPointWithSideEffectsStub = stubFactory('addItineraryPointWithSideEffects')();
          const stub = {
              //@ts-ignore
              addItineraryPointWithSideEffects: addItineraryPointWithSideEffectsStub.addItineraryPointWithSideEffects
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          const searchResult = createTestSearchResult(3333, 4444);
          await service.addPoint(searchResult);
          t.ok(addItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(addItineraryPointWithSideEffectsStub.getCall(), [searchResult, null]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[searchResult, null]]);
      });
      test('addPoint - should dispatch addItineraryPointWithSideEffects specifying the insert position', async (t) => {
          const addItineraryPointWithSideEffectsStub = stubFactory('addItineraryPointWithSideEffects')();
          const stub = {
              //@ts-ignore
              addItineraryPointWithSideEffects: addItineraryPointWithSideEffectsStub.addItineraryPointWithSideEffects
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          const searchResult = createTestSearchResult(3333, 4444);
          await service.addPoint(searchResult, 3);
          t.ok(addItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(addItineraryPointWithSideEffectsStub.getCall(), [searchResult, 3]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[searchResult, 3]]);
      });
      test('removePoint - should make the store dispatch a removeItineraryPointWithSideEffects action', async (t) => {
          const removeItineraryPointWithSideEffectsStub = stubFactory('removeItineraryPointWithSideEffects')();
          const stub = {
              //@ts-ignore
              removeItineraryPointWithSideEffects: removeItineraryPointWithSideEffectsStub.removeItineraryPointWithSideEffects
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          await service.removePoint(4);
          t.ok(removeItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(removeItineraryPointWithSideEffectsStub.getCall(), [4]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[4]]);
      });
      test('updatePoint - should dispatch changeItineraryPointWithSideEffects', async (t) => {
          const changeItineraryPointWithSideEffectsStub = stubFactory('changeItineraryPointWithSideEffects')();
          const stub = {
              //@ts-ignore
              changeItineraryPointWithSideEffects: changeItineraryPointWithSideEffectsStub.changeItineraryPointWithSideEffects
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          const searchResult = createTestSearchResult(3333, 4444);
          await service.updatePoint(3, searchResult);
          t.ok(changeItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(changeItineraryPointWithSideEffectsStub.getCall(), [3, searchResult]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[3, searchResult]]);
      });
      test('reset - should dispatch a resetRoutes action creator', t => {
          const resetRoutesStub = stubFactory('resetRoutes')();
          const stub = {
              //@ts-ignore
              resetRoutes: resetRoutesStub.resetRoutes
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          service.reset();
          t.ok(resetRoutesStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(resetRoutesStub.getCall(), []);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[]]);
      });
      test('goTo - should dispatch a goTo action creator', t => {
          const goToStub = stubFactory('goTo')();
          const stub = {
              //@ts-ignore
              goTo: goToStub.goTo
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          const searchResult = createTestSearchResult(3333, 4444);
          service.goTo(searchResult);
          t.ok(goToStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(goToStub.getCall(), [searchResult]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[searchResult]]);
      });
      test('goFrom - should dispatch a goFrom action creator', t => {
          const goFromStub = stubFactory('goFrom')();
          const stub = {
              //@ts-ignore
              goFrom: goFromStub.goFrom
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          const searchResult = createTestSearchResult(3333, 4444);
          service.goFrom(searchResult);
          t.ok(goFromStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(goFromStub.getCall(), [searchResult]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[searchResult]]);
      });
      test('selectRoute - should dispatch a selectRoute action creator', t => {
          const selectRouteStub = stubFactory('selectRoute')();
          const stub = {
              //@ts-ignore
              selectRoute: selectRouteStub.selectRoute
          };
          const store = storeFactory$1();
          //@ts-ignore
          const service = provider$1(store, stub);
          service.selectRoute(6);
          t.ok(selectRouteStub.hasBeenCalled(), 'action creator should have been called once');
          t.eq(selectRouteStub.getCall(), [6]);
          t.ok(store.hasBeenCalled(), 'dispatch should have been called');
          t.eq(store.getCall(), [[6]]);
      });
  };

  function searchResultElement ({ test }) {
      test('corner search result', t => {
          const createCorner = (lng = 1234, lat = 4321, street1 = 'st1', street2 = 'st2', municipality = 'playa') => ({
              type: 'corner',
              geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
              },
              streets: [street1, street2],
              municipality
          });
          t.test(`toPoint() should return the corner itself`, t => {
              const corner = createCorner(1234, 4321);
              t.eq(createSearchResultInstance(corner).toPoint(), {
                  lng: 1234,
                  lat: 4321
              });
          });
          t.test(`toGeoFeature() should return the point geo feature`, t => {
              const corner = createCorner(1234, 4321, 'st1', 'st2');
              t.eq(createSearchResultInstance(corner).toGeoFeature(), {
                  type: 'Point',
                  coordinates: [1234, 4321]
              });
          });
          t.test(`toString() should return the detialed corner`, t => {
              const corner = createCorner(1234, 4321, 'st1', 'st2', 'Marianao');
              t.eq(createSearchResultInstance(corner).toString(), `esquina st1 y st2, Marianao`);
          });
          t.skip('toOptionElement()', t => {
          });
          t.skip('toDetailElement()', t => {
          });
      });
      test('street search result', t => {
          const createStreet = (name, municipality = 'Playa') => ({
              type: 'street',
              name,
              geometry: {
                  type: 'LineString',
                  coordinates: 'y_dlC|q_vNf@t@oDbDaNbLwB}CrDaD'
              },
              municipality
          });
          t.test(`toPoint() should return the center of the street`, t => {
              const street = createStreet('streeeeet', 'Plaza de la revolucion');
              t.eq(createSearchResultInstance(street).toPoint(), {
                  lat: 23.12856485463554,
                  lng: -82.4153450022219
              });
          });
          t.test(`toGeoFeature() should return the line geo feature`, t => {
              const street = createStreet('streeeeet', 'Marianao');
              t.eq(createSearchResultInstance(street).toGeoFeature(), {
                  type: 'LineString',
                  coordinates: [
                      [-82.41455, 23.12717],
                      [-82.41482, 23.12697],
                      [-82.41564, 23.12785],
                      [-82.41774, 23.13026],
                      [-82.41695, 23.13086],
                      [-82.41614, 23.12996]
                  ]
              });
          });
          t.test(`toString() should return the detialed corner`, t => {
              const street = createStreet('streeeeet', 'Marianao');
              t.eq(createSearchResultInstance(street).toString(), 'streeeeet, Marianao');
          });
          t.skip('toOptionElement()', t => {
          });
          t.skip('toDetailElement()', t => {
          });
      });
      test('street_block search result', t => {
          const createStreetBlock = () => ({
              'type': 'street_block',
              'name': 'Calle 10',
              'municipality': 'Playa',
              'geometry': { 'type': 'LineString', 'coordinates': '_kdlCdp`vNxHaH' },
              'intersections': [{
                      'type': 'corner',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.419388, 23.1289632] },
                      'name': '1ra Avenida'
                  }, {
                      'type': 'corner',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.417943, 23.1273865] },
                      'name': '3ra Avenida'
                  }]
          });
          t.test('toPoint() should return the center of the block', t => {
              t.eq(createSearchResultInstance(createStreetBlock()).toPoint(), {
                  lng: -82.41866500070331,
                  lat: 23.128174925369397
              });
          });
          t.test('toGeoFeature() should return the geojson line', t => {
              t.eq(createSearchResultInstance(createStreetBlock()).toGeoFeature(), {
                  coordinates: [
                      [-82.41939, 23.12896],
                      [-82.41794, 23.12739]
                  ],
                  type: 'LineString'
              });
          });
          t.test('toString()', t => {
              t.eq(createSearchResultInstance(createStreetBlock()).toString(), 'Calle 10 e/ 1ra Avenida y 3ra Avenida, Playa');
          });
          t.skip('toOptionElement()', t => {
          });
          t.skip('toDetailElement()', t => {
          });
      });
      test('point_of_interest search result', t => {
          const createPointOfInterest = () => ({
              type: 'point_of_interest',
              name: 'Teatro Karl Marx',
              category: 'stop_position',
              geometry: { type: 'Point', 'coordinates': [-82.420269, 23.125608] },
              address: { 'number': null, 'street': null, 'municipality': 'Playa' },
              description: null,
              municipality: 'Playa'
          });
          t.test('toPoint() should return the point', t => {
              t.eq(createSearchResultInstance(createPointOfInterest()).toPoint(), { lng: -82.420269, lat: 23.125608 });
          });
          t.test('toGeoFeature() should return the geojson version of the poin', t => {
              t.eq(createSearchResultInstance(createPointOfInterest()).toGeoFeature(), {
                  type: 'Point',
                  coordinates: [-82.420269, 23.125608]
              });
          });
          t.test('toString()', t => {
              t.eq(createSearchResultInstance(createPointOfInterest()).toString(), 'Teatro Karl Marx, Playa');
          });
          t.skip('toOptionElement()', t => {
          });
          t.skip('toDetailElement()', t => {
          });
      });
      test('lng_last search result', t => {
          const createGeoCoordSearchResult = () => createGeoCoord(-82.420269, 23.125608);
          t.test('toPoint() should return the point', t => {
              t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toPoint(), { lng: -82.420269, lat: 23.125608 });
          });
          t.test('toGeoFeature() should return the geojson version of the poin', t => {
              t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toGeoFeature(), {
                  type: 'Point',
                  coordinates: [-82.420269, 23.125608]
              });
          });
          t.test('toString()', t => {
              t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toString(), 'Pointed location at -82.420269,23.125608');
          });
          t.skip('toOptionElement()', t => {
          });
          t.skip('toDetailElement()', t => {
          });
      });
  }

  var navigationActions = (a) => {
      a.test('should generate a select view action', t => {
          t.eq(selectView(View.SETTINGS), {
              type: ActionType.SELECT_VIEW,
              view: View.SETTINGS
          });
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
          let state = defaultState$6();
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
          return defaultState$6();
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

  const navigationActions$1 = {
      selectView
  };
  const provider$2 = (store, { selectView } = navigationActions$1) => {
      const stateStorage = storage(window);
      window.onpopstate = (ev) => {
          const { state } = ev;
          store.dispatch(changeHistoryPoint(state));
      };
      store.subscribe(async () => {
          const state = store.getState();
          await stateStorage.set(state);
      });
      return {
          selectView(view) {
              store.dispatch(selectView(view));
          },
          getView() {
              return store.getState().navigation.selectedView;
          }
      };
  };

  var navigationService = (a) => {
      a.test('getView() - should return the currently set view', t => {
          const storeInstance = store()(Object.assign(defaultState$6(), { navigation: { selectedView: View.ITINERARY } }));
          const service = provider$2(storeInstance);
          t.eq(service.getView(), View.ITINERARY);
      });
      a.test('selectView() - should change the current selected view', t => {
          const storeInstance = Object.assign(stubFactory('dispatch')(), {
              subscribe: () => {
              }
          });
          // @ts-ignore
          const service = provider$2(storeInstance);
          service.selectView(View.ITINERARY);
          t.ok(storeInstance.hasBeenCalled(), 'dispatch should have been called');
          t.eq(storeInstance.getCall(), [{
                  type: ActionType.SELECT_VIEW,
                  view: View.ITINERARY
              }]);
      });
  };

  var navigationReducer = (a) => {
      a.test('should forward previous state if action is not related', t => {
          t.eq(reducer({
              selectedView: View.SETTINGS
          }, fetchPointsOfInterest('woot')), {
              selectedView: View.SETTINGS
          });
      });
      a.test(`react on ${ActionType.SELECT_VIEW}: should set the new selected view`, t => {
          t.eq(reducer({
              selectedView: View.SETTINGS
          }, selectView(View.ITINERARY)), {
              selectedView: View.ITINERARY
          });
      });
  };

  var commonActions = (a) => {
      a.test('should generate a change history point action', t => {
          t.eq(changeHistoryPoint(defaultState$6()), {
              type: ActionType.CHANGE_HISTORY_POINT,
              state: defaultState$6()
          });
      });
  };

  var mapActions = (a) => {
      a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with the center only`, t => {
          t.eq(updateMapPosition({
              center: [123, 456]
          }), {
              type: ActionType.UPDATE_MAP,
              center: [123, 456]
          });
      });
      a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with the zoom only`, t => {
          t.eq(updateMapPosition({
              zoom: 12
          }), {
              type: ActionType.UPDATE_MAP,
              zoom: 12
          });
      });
      a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with both the zoom and the center`, t => {
          t.eq(updateMapPosition({
              zoom: 12,
              center: [123, 456]
          }), {
              type: ActionType.UPDATE_MAP,
              zoom: 12,
              center: [123, 456]
          });
      });
  };

  function mapReducer ({ test }) {
      test(`should forward previous state if action is not relevant`, t => {
          const state = defaultState$6();
          t.eq(reducer$4(state.map, selectView(View.SETTINGS)), defaultState$6().map);
      });
      test(`should react to ${ActionType.UPDATE_MAP} action by updating the map part of the state`, t => {
          const initial = defaultState$6();
          t.eq(reducer$4(initial.map, updateMapPosition({
              center: [123, 654],
              zoom: 6
          })), {
              center: [123, 654],
              zoom: 6
          });
      });
  }

  const emitter = () => {
      const listenersLists = {};
      const instance = {
          on(event, ...listeners) {
              listenersLists[event] = (listenersLists[event] || []).concat(listeners);
              return instance;
          },
          dispatch(event, ...args) {
              const listeners = listenersLists[event] || [];
              for (const listener of listeners) {
                  listener(...args);
              }
              return instance;
          },
          off(event, ...listeners) {
              if (event === undefined) {
                  Object.keys(listenersLists).forEach(ev => instance.off(ev));
              }
              else {
                  const list = listenersLists[event] || [];
                  listenersLists[event] = listeners.length ? list.filter(listener => !listeners.includes(listener)) : [];
              }
              return instance;
          }
      };
      return instance;
  };
  const proxyListener = (eventMap) => ({ emitter }) => {
      const eventListeners = {};
      const proxy = {
          off(ev) {
              if (!ev) {
                  Object.keys(eventListeners).forEach(eventName => proxy.off(eventName));
              }
              if (eventListeners[ev]) {
                  emitter.off(ev, ...eventListeners[ev]);
              }
              return proxy;
          }
      };
      for (const ev of Object.keys(eventMap)) {
          const method = eventMap[ev];
          eventListeners[ev] = [];
          proxy[method] = function (...listeners) {
              eventListeners[ev] = eventListeners[ev].concat(listeners);
              emitter.on(ev, ...listeners);
              return proxy;
          };
      }
      return proxy;
  };

  const LONG_PRESS_TIME = 300;
  const isSameLocation = (pos1, pos2) => {
      return pos1.lat === pos2.lat && pos1.lng === pos2.lng;
  };
  const factory$3 = (source) => {
      let mouseDownTime = null;
      let mouseDownPosition = null;
      const proxy = emitter();
      const proxyFactory = proxyListener({
          ["CLICK_EVENT" /* CLICK_EVENT */]: 'onClick',
          ["LONG_CLICK_EVENT" /* LONG_CLICK_EVENT */]: 'onLongClick'
      });
      //@ts-ignore
      const instance = proxyFactory({ emitter: proxy });
      //@ts-ignore
      source.addEventListener('mousedown', (ev) => {
          mouseDownTime = Date.now();
          mouseDownPosition = ev.lngLat;
      });
      //@ts-ignore
      source.addEventListener('mouseup', (ev) => {
          try {
              const mouseUpTime = Date.now();
              if (isSameLocation(mouseDownPosition, ev.lngLat)) {
                  const eventName = (mouseUpTime - mouseDownTime) < LONG_PRESS_TIME ?
                      "CLICK_EVENT" /* CLICK_EVENT */ :
                      "LONG_CLICK_EVENT" /* LONG_CLICK_EVENT */;
                  proxy.dispatch(eventName, ev);
              }
          }
          catch (e) {
              console.error(e);
          }
          finally {
              mouseDownTime = null;
              mouseDownPosition = null;
          }
      });
      return instance;
  };

  const fakeSource = () => {
      const instance = emitter();
      //@ts-ignore
      instance.addEventListener = instance.on.bind(instance);
      //@ts-ignore
      return instance;
  };
  const onClickStub = stubFactory('onClick');
  const onLongClickStub = stubFactory('onLongClick');
  var canvasInteraction = ({ test }) => {
      test('mouse down/mouse up larger than threshold should result in a "long click" event ', async (t) => {
          const onClick = onClickStub();
          const onLongClick = onLongClickStub();
          const source = fakeSource();
          const canvas = factory$3(source);
          // @ts-ignore
          canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
          // @ts-ignore
          canvas.onClick(onClick.onClick.bind(onClick));
          const point = {
              lng: 333,
              lat: 444
          };
          // @ts-ignore
          source.dispatch('mousedown', { lngLat: point });
          await wait(1.5 * LONG_PRESS_TIME);
          // @ts-ignore
          source.dispatch('mouseup', { lngLat: point });
          t.ok(onClick.hasBeenCalled(0), 'click handler should not have been called');
          t.ok(onLongClick.hasBeenCalled(1), 'long click handler should have been called');
          t.eq(onLongClick.getCall(0), [{ lngLat: point }], 'should have got point location as argument to the handler');
      });
      test('mouse down/mouse up shorter than threshold should result in a "click" event ', async (t) => {
          const onClick = onClickStub();
          const onLongClick = onLongClickStub();
          const source = fakeSource();
          const canvas = factory$3(source);
          // @ts-ignore
          canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
          // @ts-ignore
          canvas.onClick(onClick.onClick.bind(onClick));
          const point = {
              lng: 333,
              lat: 444
          };
          // @ts-ignore
          source.dispatch('mousedown', { lngLat: point });
          // @ts-ignore
          source.dispatch('mouseup', { lngLat: point });
          t.ok(onClick.hasBeenCalled(1), 'click handler should have been called');
          t.ok(onLongClick.hasBeenCalled(0), 'long click handler should not have been called');
          t.eq(onClick.getCall(0), [{ lngLat: point }], 'should have got point location as argument to the handler');
      });
      test('mouse down/mouse up shorter than threshold should result in a "click" event ', async (t) => {
          const onClick = onClickStub();
          const onLongClick = onLongClickStub();
          const source = fakeSource();
          const canvas = factory$3(source);
          // @ts-ignore
          canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
          // @ts-ignore
          canvas.onClick(onClick.onClick.bind(onClick));
          // @ts-ignore
          source.dispatch('mousedown', {
              lngLat: {
                  lng: 123,
                  lat: 321
              }
          });
          // @ts-ignore
          source.dispatch('mouseup', {
              lngLat: {
                  lng: 1234,
                  lat: 4321
              }
          });
          t.ok(onClick.hasBeenCalled(0), 'click handler should not have been called');
          t.ok(onLongClick.hasBeenCalled(0), 'long click handler should not have been called');
      });
  };

  function urlStorage (a) {
      a.test('Serialize a state currently in search view', t => {
          const state = Object.assign(defaultState$6(), {
              search: {
                  searchResult: [{
                          'id': 5988,
                          'type': 'point_of_interest',
                          'name': 'Vistamar',
                          'category': 'restaurant',
                          'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                          'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                          'description': null
                      }],
                  selectedSearchResult: {
                      'id': 5988,
                      'type': 'point_of_interest',
                      'name': 'Vistamar',
                      'category': 'restaurant',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                      'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                      'description': null
                  }
              }
          });
          const expected = Object.assign(defaultState$6(), {
              search: {
                  isSearching: false,
                  searchResult: [],
                  selectedSearchResult: {
                      'id': 5988,
                      'type': 'point_of_interest',
                      'name': 'Vistamar',
                      'category': 'restaurant',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                      'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                      'description': null
                  }
              }
          });
          t.eq(deserialize(serialize(state)).search, expected.search, 'should have serialized the selected result only');
      });
      a.test('Serialize a state currently in search view should serialize map location data', t => {
          const state = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              search: {
                  searchResult: [{
                          'id': 5988,
                          'type': 'point_of_interest',
                          'name': 'Vistamar',
                          'category': 'restaurant',
                          'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                          'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                          'description': null
                      }],
                  selectedSearchResult: {
                      'id': 5988,
                      'type': 'point_of_interest',
                      'name': 'Vistamar',
                      'category': 'restaurant',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                      'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                      'description': null
                  }
              }
          });
          const expected = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              search: {
                  isSearching: false,
                  searchResult: [],
                  selectedSearchResult: {
                      'id': 5988,
                      'type': 'point_of_interest',
                      'name': 'Vistamar',
                      'category': 'restaurant',
                      'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                      'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                      'description': null
                  }
              }
          });
          t.eq(deserialize(serialize(state)), expected, 'should have serialized the selected result only');
      });
      a.test('Serialize a state currently in itinerary view', t => {
          const state = Object.assign(defaultState$6(), {
              navigation: {
                  selectedView: View.ITINERARY
              },
              itinerary: {
                  stops: [{
                          id: 0,
                          item: {
                              'id': 5988,
                              'type': 'point_of_interest',
                              'name': 'Vistamar',
                              'category': 'restaurant',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                              'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                              'description': null
                          }
                      }, {
                          id: 1,
                          item: {
                              'id': 7583,
                              'type': 'point_of_interest',
                              'name': 'Fábrica de Arte Cubano',
                              'category': 'nightclub',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                              'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                              'description': null
                          }
                      }],
                  routes: [{
                          'geometry': 'iadlCjv~uNg@`@pGxIlM~RhBhB{]xZvSnZ',
                          'legs': [{ 'summary': '', 'weight': 650, 'duration': 534.4, 'steps': [], 'distance': 2055 }],
                          'weight_name': 'cyclability',
                          'weight': 650,
                          'duration': 534.4,
                          'distance': 2055
                      }],
                  selectedRoute: 0
              },
          });
          const expected = Object.assign(defaultState$6(), {
              navigation: {
                  selectedView: View.ITINERARY
              },
              itinerary: {
                  stops: [{
                          id: 0,
                          item: {
                              'id': 5988,
                              'type': 'point_of_interest',
                              'name': 'Vistamar',
                              'category': 'restaurant',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                              'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                              'description': null
                          }
                      }, {
                          id: 1,
                          item: {
                              'id': 7583,
                              'type': 'point_of_interest',
                              'name': 'Fábrica de Arte Cubano',
                              'category': 'nightclub',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                              'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                              'description': null
                          }
                      }],
                  routes: [],
                  selectedRoute: 0
              }
          });
          t.eq(deserialize(serialize(state)).itinerary, expected.itinerary, 'should have serialized the stops points only');
      });
      a.test('Serialize a state currently in itinerary view should save map state too', t => {
          const state = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              navigation: {
                  selectedView: View.ITINERARY
              },
              itinerary: {
                  stops: [{
                          id: 0,
                          item: {
                              'id': 5988,
                              'type': 'point_of_interest',
                              'name': 'Vistamar',
                              'category': 'restaurant',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                              'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                              'description': null
                          }
                      }, {
                          id: 1,
                          item: {
                              'id': 7583,
                              'type': 'point_of_interest',
                              'name': 'Fábrica de Arte Cubano',
                              'category': 'nightclub',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                              'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                              'description': null
                          }
                      }],
                  routes: [{
                          'geometry': 'iadlCjv~uNg@`@pGxIlM~RhBhB{]xZvSnZ',
                          'legs': [{ 'summary': '', 'weight': 650, 'duration': 534.4, 'steps': [], 'distance': 2055 }],
                          'weight_name': 'cyclability',
                          'weight': 650,
                          'duration': 534.4,
                          'distance': 2055
                      }],
                  selectedRoute: 0
              }
          });
          const expected = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              navigation: {
                  selectedView: View.ITINERARY
              },
              itinerary: {
                  stops: [{
                          id: 0,
                          item: {
                              'id': 5988,
                              'type': 'point_of_interest',
                              'name': 'Vistamar',
                              'category': 'restaurant',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                              'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                              'description': null
                          }
                      }, {
                          id: 1,
                          item: {
                              'id': 7583,
                              'type': 'point_of_interest',
                              'name': 'Fábrica de Arte Cubano',
                              'category': 'nightclub',
                              'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                              'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                              'description': null
                          }
                      }],
                  routes: [],
                  selectedRoute: 0
              }
          });
          t.eq(deserialize(serialize(state)).itinerary, expected.itinerary, 'should have serialized the stops points only');
      });
      a.test('Serialize a state currently in leisure view', t => {
          const state = Object.assign(defaultState$6(), {
              navigation: { selectedView: View.LEISURE }
          });
          t.eq(deserialize(serialize(state)), state);
      });
      a.test('Serialize a state currently in leisure view should save map state too', t => {
          const state = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              navigation: {
                  selectedView: View.LEISURE
              }
          });
          const expected = Object.assign(defaultState$6(), {
              map: {
                  zoom: 15.48,
                  center: [-82.413233, 23.129075]
              },
              navigation: {
                  selectedView: View.LEISURE
              }
          });
          t.eq(deserialize(serialize(state)), expected, 'should have serialized the stops points only');
      });
      a.test('should set the default state if does not understand the url', t => {
          const state = deserialize(new URL('foo/bar/bim', 'https://localhost.com'));
          t.eq(state, defaultState$6());
      });
      a.test(`url storage - get() should get the result from the window.location.href`, async (t) => {
          const state = Object.assign(defaultState$6(), {
              search: {
                  searchResult: [],
                  selectedSearchResult: createTestSearchResult(1234, 4321),
                  isSearching: false
              }
          });
          const fakeWindow = {
              location: {
                  href: serialize(state)
              }
          };
          const service = storage(fakeWindow);
          t.eq(await service.get(), state);
      });
      a.test(`url storage - set() should push the new state in the history `, async (t) => {
          const argList = [];
          const fakeWindow = {
              history: {
                  pushState(...args) {
                      argList.push(args);
                  }
              },
              location: {
                  href: serialize(defaultState$6())
              }
          };
          const service = storage(fakeWindow);
          const newState = Object.assign(defaultState$6(), {
              map: {
                  center: [-82, 23],
                  zoom: 16
              }
          });
          await service.set(newState);
          t.eq(argList, [
              [
                  newState,
                  '',
                  '/search/@-82,23,16z/data=eyJzZWFyY2giOnsic2VsZWN0ZWRTZWFyY2hSZXN1bHQiOm51bGx9fQ=='
              ]
          ]);
      });
      a.test(`url storage - set() should not push the new state in the history if the new state is equivalent`, async (t) => {
          const argList = [];
          const fakeWindow = {
              history: {
                  pushState(...args) {
                      argList.push(args);
                      fakeWindow.location.href = serialize(args[0]).href;
                  }
              },
              location: {
                  href: serialize(defaultState$6()).href
              }
          };
          const service = storage(fakeWindow);
          const newState = Object.assign(defaultState$6(), {
              map: {
                  center: [-82, 23],
                  zoom: 16
              }
          });
          await service.set(newState);
          await service.set(newState);
          t.eq(argList, [
              [
                  newState,
                  '',
                  '/search/@-82,23,16z/data=eyJzZWFyY2giOnsic2VsZWN0ZWRTZWFyY2hSZXN1bHQiOm51bGx9fQ=='
              ]
          ]);
      });
  }

  const searchViewTool = (registry) => {
      return {
          async clickAction(ev) {
              const searchService = registry.get('search');
              const { result } = await searchService.searchPointOfInterestNearBy(ev.lngLat);
              if (result.length) {
                  searchService.selectSearchResult(result[0]);
              }
          },
          async longClickAction(ev) {
              const searchService = registry.get('search');
              searchService.searchPointOfInterest('');
              searchService.selectSearchResult(createGeoCoord(ev.lngLat.lng, ev.lngLat.lat));
          }
      };
  };

  const fakeRegistry = () => {
      const stub = [];
      let selectCalls = [];
      let searchPOICalls = [];
      // @ts-ignore
      const fakeSearchService = {
          respondWith(arg, value) {
              stub.push({ arg, value });
              return this;
          },
          searchCalls() {
              return searchPOICalls;
          },
          selectCalls() {
              return selectCalls;
          },
          async searchPointOfInterest(arg) {
              searchPOICalls.push(arg);
              return [];
          },
          async searchPointOfInterestNearBy(arg) {
              // @ts-ignore
              const resp = stub.find(({ arg: key }) => isSameLocation(key, arg));
              if (!resp) {
                  throw new Error('unexpected argument');
              }
              return resp.value;
          },
          selectSearchResult(r) {
              selectCalls.push(r);
          }
      };
      // @ts-ignore
      return {
          get(name) {
              if (name !== 'search') {
                  throw new Error('should request search service only');
              }
              return fakeSearchService;
          }
      };
  };
  var searchTool = ({ test }) => {
      test('click action should fetch the suggestions near by the event location', async (t) => {
          const registry = fakeRegistry();
          const fakeService = registry.get('search');
          const location = { lng: 333, lat: 444 };
          fakeService.respondWith(location, {
              result: [
                  createTestSearchResult(location.lng, location.lat),
                  createTestSearchResult(1234, 4321)
              ]
          });
          const searchTool = searchViewTool(registry);
          await searchTool.clickAction({
              // @ts-ignore
              lngLat: {
                  lng: 333,
                  lat: 444
              }
          });
          t.eq(fakeService.selectCalls(), [createTestSearchResult(location.lng, location.lat)], 'should have selected the first result');
      });
      test('long click action: should init suggestions and select an arbitrary location', async (t) => {
          const registry = fakeRegistry();
          const fakeService = registry.get('search');
          const searchTool = searchViewTool(registry);
          // @ts-ignore
          await searchTool.longClickAction({ lngLat: { lng: 333, lat: 444 } });
          t.eq(fakeService.searchCalls(), [''], 'should have called the search with empty string argument');
          t.eq(fakeService.selectCalls(), [{
                  type: 'lng_lat',
                  lng: 333,
                  lat: 444
              }], 'should have called the select with the event location');
      });
  };

  const factory$4 = () => {
      const toolBox = new Map();
      let currentTool = null;
      return {
          selectTool(view) {
              currentTool = toolBox.get(view);
              return this;
          },
          addTool(view, tool) {
              toolBox.set(view, tool);
              return this;
          },
          async clickAction(ev) {
              if (currentTool && typeof currentTool.clickAction === 'function') {
                  currentTool.clickAction(ev);
              }
          },
          async longClickAction(ev) {
              if (currentTool && typeof currentTool.longClickAction === 'function') {
                  currentTool.longClickAction(ev);
              }
          }
      };
  };

  function toolBox (a) {
      const clickActionFactory = stubFactory('clickAction');
      const longClickActionFactory = stubFactory('longClickAction');
      a.test('click action should trigger the current click action tool', t => {
          const toolBox = factory$4();
          const tool = clickActionFactory();
          toolBox.addTool(View.SEARCH, tool);
          toolBox.selectTool(View.SEARCH);
          //@ts-ignore
          toolBox.clickAction({ lngLat: { lng: 333, lat: 444 } });
          t.ok(tool.hasBeenCalled(1), 'the click action should have been called');
          t.eq(tool.getCall(0), [{ lngLat: { lng: 333, lat: 444 } }]);
      });
      a.test('click action should not trigger the current tool if it does not implement clickAction', t => {
          const toolBox = factory$4();
          const tool = longClickActionFactory();
          toolBox.addTool(View.SEARCH, tool);
          toolBox.selectTool(View.SEARCH);
          //@ts-ignore
          toolBox.clickAction({ lngLat: { lng: 333, lat: 444 } });
          t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
      });
      a.test('long click action should trigger the current long click action tool', t => {
          const toolBox = factory$4();
          const tool = longClickActionFactory();
          toolBox.addTool(View.SEARCH, tool);
          toolBox.selectTool(View.SEARCH);
          //@ts-ignore
          toolBox.longClickAction({ lngLat: { lng: 333, lat: 444 } });
          t.ok(tool.hasBeenCalled(1), 'the long click action should have been called');
          t.eq(tool.getCall(0), [{ lngLat: { lng: 333, lat: 444 } }]);
      });
      a.test('long click action should not trigger the current tool if it does not implement longClickAction', t => {
          const toolBox = factory$4();
          const tool = clickActionFactory();
          toolBox.addTool(View.SEARCH, tool);
          toolBox.selectTool(View.SEARCH);
          //@ts-ignore
          toolBox.longClickAction({ lngLat: { lng: 333, lat: 444 } });
          t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
      });
  }

  const fetchLeisureRoutes = () => ({
      type: ActionType.FETCH_LEISURE_ROUTES
  });
  const fetchLeisureRoutesWithFailure = (error) => ({
      type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
      error
  });
  const fetchLeisureRoutesWithSuccess = (result) => ({
      type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
      result
  });
  const fetchLeisureRoutesFromAPI = () => async (dispatch, getState, API) => {
      const { leisure } = API;
      dispatch(fetchLeisureRoutes());
      try {
          const result = await leisure.searchRoutes();
          dispatch(fetchLeisureRoutesWithSuccess(result));
      }
      catch (e) {
          return dispatch(fetchLeisureRoutesWithFailure(e));
      }
  };
  const selectLeisureRoute = (routeId) => ({
      type: ActionType.SELECT_LEISURE_ROUTE,
      routeId
  });

  var leisureAction = (a) => {
      a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES} action`, t => {
          t.eq(fetchLeisureRoutes(), { type: ActionType.FETCH_LEISURE_ROUTES }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES} action`);
      });
      a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS}`, t => {
          const leisureRoutes = [{
                  id: 5,
                  duration: 100,
                  distance: 2010,
                  description: 'descriptions',
                  title: 'A nice promenade',
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded string'
                  },
                  stops: []
              }];
          t.eq(fetchLeisureRoutesWithSuccess(leisureRoutes), {
              type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
              result: leisureRoutes
          }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action passing the result along`);
      });
      a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} action`, t => {
          const error = new Error('some unexpected error');
          t.eq(fetchLeisureRoutesWithFailure(error), {
              type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
              error
          }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} providing the error`);
      });
      a.test('fetch leisure route from API when API returns data', async (t) => {
          const actions = [];
          const thunk = fetchLeisureRoutesFromAPI();
          const leisureRouteStub = [{
                  id: 5,
                  duration: 100,
                  distance: 2010,
                  description: 'descriptions',
                  title: 'A nice promenade',
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded string'
                  },
                  stops: []
              }];
          const fakeDispatch = a => actions.push(a);
          const fakeLeisure = {
              async searchRoutes() {
                  return leisureRouteStub;
              }
          };
          await thunk(fakeDispatch, () => {
          }, {
              //@ts-ignore
              leisure: fakeLeisure
          });
          t.eq(actions.length, 2, 'should have dispatched two actions');
          t.eq(actions[0], { type: ActionType.FETCH_LEISURE_ROUTES }, `first the ${ActionType.FETCH_LEISURE_ROUTES} action`);
          t.eq(actions[1], {
              type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
              result: leisureRouteStub
          }, `then the ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS}, forwarding the result from the API call`);
      });
      a.test('fetch leisure route from API when API fails', async (t) => {
          const actions = [];
          const error = new Error('API error');
          const thunk = fetchLeisureRoutesFromAPI();
          const fakeDispatch = a => actions.push(a);
          const fakeLeisure = {
              async searchRoutes() {
                  throw error;
              }
          };
          await thunk(fakeDispatch, () => {
          }, 
          //@ts-ignore
          {
              leisure: fakeLeisure
          });
          t.eq(actions.length, 2, 'should have dispatched two actions');
          t.eq(actions[0], { type: ActionType.FETCH_LEISURE_ROUTES }, `first the ${ActionType.FETCH_LEISURE_ROUTES} action`);
          t.eq(actions[1], {
              type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
              error
          }, `then the ${ActionType.FETCH_LEISURE_ROUTES_FAILURE}, forwarding the error`);
      });
  };

  const leisureActions = {
      fetchLeisureRoutesFromAPI,
      selectLeisureRoute
  };
  const provider$3 = (store, { fetchLeisureRoutesFromAPI, selectLeisureRoute } = leisureActions) => {
      return {
          async searchRoutes() {
              store.dispatch(fetchLeisureRoutesFromAPI());
          },
          selectRoute(id) {
              store.dispatch(selectLeisureRoute(id));
          }
      };
  };

  const storeFactory$2 = stubFactory('dispatch');
  var leisureService = (a) => {
      a.test(`searchRoute should dispatch the result of ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action`, async (t) => {
          const store = storeFactory$2();
          const fetchRouteFromAPIStub = stubFactory('fetchLeisureRoutesFromAPI')();
          const stub = {
              //@ts-ignore
              fetchLeisureRoutesFromAPI: fetchRouteFromAPIStub.fetchLeisureRoutesFromAPI
          };
          //@ts-ignore
          const service = provider$3(store, stub);
          await service.searchRoutes();
          t.ok(fetchRouteFromAPIStub.hasBeenCalled(), 'fetchLeisureRoutesFromAPI action creator should have been called');
          t.eq(fetchRouteFromAPIStub.getCall(), [], 'no argument should have been provided');
          t.ok(store.hasBeenCalled(), 'store.dispatch should have been called');
          t.eq(store.getCall(), [[]], `should not have provided any argument`);
      });
      a.test(`selectRoute should dispatch the result of ${ActionType.SELECT_LEISURE_ROUTE} action`, t => {
          const store = storeFactory$2();
          const selectLeisureRouteStub = stubFactory('selectLeisureRoute')();
          const stub = {
              //@ts-ignore
              selectLeisureRoute: selectLeisureRouteStub.selectLeisureRoute
          };
          //@ts-ignore
          const service = provider$3(store, stub);
          service.selectRoute(4);
          t.ok(selectLeisureRouteStub.hasBeenCalled(), 'selectLeisureRoute action creator should have been called');
          t.eq(selectLeisureRouteStub.getCall(), [4], 'should have been called with the route id');
          t.ok(store.hasBeenCalled(), 'store.dispatch should have been called');
          t.eq(store.getCall(), [[4]], `route id should have been forwarded`);
      });
  };

  const createInitialState = (routes = []) => ({
      isSearching: false,
      selectedRouteId: null,
      routes
  });
  var leisureReducer = (a) => {
      a.test(`unrelated action`, t => {
          t.eq(reducer$5(createInitialState(), selectView(View.LEISURE)), {
              isSearching: false,
              selectedRouteId: null,
              routes: []
          });
      });
      a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES} action`, t => {
          t.eq(reducer$5(createInitialState(), fetchLeisureRoutes()), {
              isSearching: true,
              selectedRouteId: null,
              routes: []
          }, 'should be put into searching mode');
      });
      a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action when result is not empty`, t => {
          const routes = [{
                  id: 8,
                  title: 'first balade',
                  description: 'a nice one',
                  stops: [],
                  duration: 2000,
                  distance: 3000,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }, {
                  id: 66,
                  title: 'second balade',
                  description: 'a nicer one',
                  stops: [],
                  duration: 124,
                  distance: 432,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }];
          t.eq(reducer$5(createInitialState(routes), fetchLeisureRoutesWithSuccess(routes)), {
              isSearching: false,
              routes,
              selectedRouteId: 8
          });
      });
      a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action when result is not empty`, t => {
          const routes = [];
          t.eq(reducer$5(createInitialState(routes), fetchLeisureRoutesWithSuccess(routes)), {
              isSearching: false,
              routes,
              selectedRouteId: null
          });
      });
      a.test(`react to ${ActionType.SELECT_LEISURE_ROUTE} action`, t => {
          const routes = [{
                  id: 8,
                  title: 'first balade',
                  description: 'a nice one',
                  stops: [],
                  duration: 2000,
                  distance: 3000,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }, {
                  id: 66,
                  title: 'second balade',
                  description: 'a nicer one',
                  stops: [],
                  duration: 124,
                  distance: 432,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }];
          const leisureState = createInitialState(routes);
          leisureState.selectedRouteId = 8;
          t.eq(reducer$5(leisureState, selectLeisureRoute(66)), {
              isSearching: false,
              routes,
              selectedRouteId: 66
          });
      });
      a.test(`react to ${ActionType.SELECT_LEISURE_ROUTE} action when route id does not match any route`, t => {
          const routes = [{
                  id: 8,
                  title: 'first balade',
                  description: 'a nice one',
                  stops: [],
                  duration: 2000,
                  distance: 3000,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }, {
                  id: 66,
                  title: 'second balade',
                  description: 'a nicer one',
                  stops: [],
                  duration: 124,
                  distance: 432,
                  geometry: {
                      type: 'LineString',
                      coordinates: 'some encoded stuff'
                  }
              }];
          const leisureState = createInitialState(routes);
          leisureState.selectedRouteId = 8;
          t.eq(reducer$5(leisureState, selectLeisureRoute(999)), {
              isSearching: false,
              routes,
              selectedRouteId: 8
          });
      });
      a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} action`, t => {
          const error = new Error('oops');
          const leisureState = createInitialState();
          leisureState.isSearching = true;
          t.eq(reducer$5(leisureState, fetchLeisureRoutesWithFailure(error)), {
              isSearching: false,
              routes: [],
              selectedRouteId: null
          }, 'should have reset the isSearching to false');
      });
  };

  // test.indent();
  test('ITINERARY ACTIONS', itineraryAction);
  test('ITINERARY REDUCER', itineraryReducer);
  test('ITINERARY SERVICE', itineraryService);
  test('SEARCH ACTIONS', searchAction);
  test('SEARCH REDUCER', searchReducer);
  test('SEARCH SERVICE', searchService);
  test('SETTINGS ACTIONS', settingsAction);
  test('SETTINGS REDUCER', settingsReducer);
  test('NAVIGATION ACTIONS', navigationActions);
  test('NAVIGATION REDUCER', navigationReducer);
  test('NAVIGATION SERVICE', navigationService);
  test('MAP UTILS', mapUtil);
  test('MAP ACTIONS', mapActions);
  test('MAP REDUCER', mapReducer);
  test('SEARCH TOOL', searchTool);
  test('SEARCH-RESULT ELEMENTS', searchResultElement);
  test('COMMON ACTIONS', commonActions);
  test('CANVAS INTERACTIONS', canvasInteraction);
  test('URL STORAGE', urlStorage);
  test('TOOL BOX', toolBox);
  test('LEISURE ACTIONS', leisureAction);
  test('LEISURE SERVICE', leisureService);
  test('LEISURE REDUCER', leisureReducer);

}());
//# sourceMappingURL=debug.js.map
