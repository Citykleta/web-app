import { d as decodeLine, h as html, t as truncate, A as ActionType } from './utils-e7d8eaa2.js';

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

var mapboxConf = Object.freeze({
    accessToken: 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw',
    style: 'http://localhost:8080/styles/osm-bright/style.json',
    center: [-82.367408, 23.122419],
    zoom: 12.4,
    minZoom: 11,
    doubleClickZoom: false,
    logoPosition: 'bottom-right'
});

const defaultState$2 = () => ({
    zoom: mapboxConf.zoom,
    center: mapboxConf.center
});

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

export { fetchRoutesWithFailure as A, fetchRoutesFromAPI as B, moveItineraryPoint as C, mapboxConf as D, InsertionPosition as I, defaultState$1 as a, defaultState$2 as b, createSearchResultInstance as c, defaultState as d, addItineraryPointWithSideEffects as e, changeItineraryPointWithSideEffects as f, goTo as g, goFrom as h, resetRoutes as i, myLocation as j, reducer as k, loadingIndicator as l, moveItineraryPointWithSideEffects as m, reducer$1 as n, fromLine as o, swap as p, plus as q, removeItineraryPointWithSideEffects as r, selectRoute as s, dragHandle as t, remove as u, addItineraryPoint as v, removeItineraryPoint as w, updateItineraryPoint as x, fetchRoutes as y, fetchRoutesWithSuccess as z };
//# sourceMappingURL=icons-215ae7b9.js.map
