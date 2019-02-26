import {ItineraryService, provider as itineraryProvider} from './itinerary';
import {Store, provider as storeProvider} from './store';
import {NavigationService, provider as navigationProvider} from './navigation';
import {MapToolService, provider as mapToolProvider} from './map-tool';
import {factory as directions} from '../sdk/directions';

export interface ServiceRegistry {
    itinerary: ItineraryService;
    store: Store;
    navigation: NavigationService;
    mapTools: MapToolService;
}

const provider = (): ServiceRegistry => {
    // @ts-ignore
    const registry: ServiceRegistry = {};

    const store = registry.store = storeProvider({
        directions: directions()
    });
    // const store = registry.store = storeProvider({
    //     directions: {
    //         async search(points) {
    //             return {
    //                 'routes': [
    //                     {
    //                         'geometry': 'efdlCvk`vN~CsCzBdD`ChD~HaHNMJK`IcHdA}@lBj@rBRfCZlBZXc@BQBYFwE|FXVmEJmCBA\\K',
    //                         'legs': [
    //                             {
    //                                 'summary': 'Calle 14, Calle 29',
    //                                 'weight': 477.4,
    //                                 'duration': 434.3,
    //                                 'steps': [
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 0,
    //                                                 'entry': [
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     140
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.41868,
    //                                                     23.128191
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'efdlCvk`vN~CsC',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 140,
    //                                             'bearing_before': 0,
    //                                             'location': [
    //                                                 -82.41868,
    //                                                 23.128191
    //                                             ],
    //                                             'type': 'depart',
    //                                             'instruction': 'Head southeast on Calle 10'
    //                                         },
    //                                         'weight': 41.3,
    //                                         'duration': 34.3,
    //                                         'name': 'Calle 10',
    //                                         'distance': 117
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 2,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     45,
    //                                                     135,
    //                                                     225,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.417943,
    //                                                     23.127387
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 2,
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     false,
    //                                                     true,
    //                                                     true,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     45,
    //                                                     135,
    //                                                     225,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.41877,
    //                                                     23.126765
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'eadlCbg`vNzBdD`ChD',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 230,
    //                                             'bearing_before': 139,
    //                                             'location': [
    //                                                 -82.417943,
    //                                                 23.127387
    //                                             ],
    //                                             'modifier': 'right',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn right onto 3ra Avenida'
    //                                         },
    //                                         'weight': 90.19999999999999,
    //                                         'duration': 61.599999999999994,
    //                                         'name': '3ra Avenida',
    //                                         'distance': 221.7
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     false,
    //                                                     true,
    //                                                     true,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     45,
    //                                                     135,
    //                                                     225,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.419616,
    //                                                     23.12612
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     45,
    //                                                     135,
    //                                                     225,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.416577,
    //                                                     23.122768
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'gyclCrq`vN~HaHNMJK`IcHdA}@',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 139,
    //                                             'bearing_before': 229,
    //                                             'location': [
    //                                                 -82.419616,
    //                                                 23.12612
    //                                             ],
    //                                             'modifier': 'left',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn left onto Calle 14'
    //                                         },
    //                                         'weight': 130.1,
    //                                         'duration': 130.1,
    //                                         'name': 'Calle 14',
    //                                         'distance': 534.7
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 2,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     135,
    //                                                     195,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.416273,
    //                                                     23.122424
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     false,
    //                                                     true,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     195,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.41659,
    //                                                     23.121294
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'cbclCt|_vNlBj@rBRfCZlBZ',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 199,
    //                                             'bearing_before': 140,
    //                                             'location': [
    //                                                 -82.416273,
    //                                                 23.122424
    //                                             ],
    //                                             'modifier': 'right',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn right onto Calle 29'
    //                                         },
    //                                         'weight': 69,
    //                                         'duration': 69,
    //                                         'name': 'Calle 29',
    //                                         'distance': 270.2
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     false,
    //                                                     true,
    //                                                     true,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     135,
    //                                                     195,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.416868,
    //                                                     23.120064
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     105,
    //                                                     195,
    //                                                     315
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.416693,
    //                                                     23.119933
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     105,
    //                                                     195,
    //                                                     285
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.416595,
    //                                                     23.119913
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     90,
    //                                                     180,
    //                                                     285
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.41647,
    //                                                     23.11989
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'ksblCl``vNXc@BQBYFwE',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 127,
    //                                             'bearing_before': 192,
    //                                             'location': [
    //                                                 -82.416868,
    //                                                 23.120064
    //                                             ],
    //                                             'modifier': 'left',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn left onto Calle 18'
    //                                         },
    //                                         'weight': 47,
    //                                         'duration': 47,
    //                                         'name': 'Calle 18',
    //                                         'distance': 157.3
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 2,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     0,
    //                                                     90,
    //                                                     180,
    //                                                     270
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.415386,
    //                                                     23.119854
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'arblCdw_vN|FX',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 185,
    //                                             'bearing_before': 91,
    //                                             'location': [
    //                                                 -82.415386,
    //                                                 23.119854
    //                                             ],
    //                                             'modifier': 'right',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn right onto 33'
    //                                         },
    //                                         'weight': 42.3,
    //                                         'duration': 42.3,
    //                                         'name': '33',
    //                                         'distance': 142.4
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     false,
    //                                                     true,
    //                                                     true,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     0,
    //                                                     90,
    //                                                     180,
    //                                                     285
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.415523,
    //                                                     23.11858
    //                                                 ]
    //                                             },
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 3,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     true,
    //                                                     false
    //                                                 ],
    //                                                 'bearings': [
    //                                                     15,
    //                                                     90,
    //                                                     195,
    //                                                     270
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.414491,
    //                                                     23.118463
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': 'cjblC~w_vNVmEJmC',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 95,
    //                                             'bearing_before': 185,
    //                                             'location': [
    //                                                 -82.415523,
    //                                                 23.11858
    //                                             ],
    //                                             'modifier': 'left',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn left onto 20'
    //                                         },
    //                                         'weight': 45.1,
    //                                         'duration': 45.1,
    //                                         'name': '20',
    //                                         'distance': 179.6
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'out': 1,
    //                                                 'in': 2,
    //                                                 'entry': [
    //                                                     true,
    //                                                     true,
    //                                                     false,
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     90,
    //                                                     165,
    //                                                     270,
    //                                                     345
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.413778,
    //                                                     23.118402
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': '_iblCbm_vNBA\\K',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 157,
    //                                             'bearing_before': 94,
    //                                             'location': [
    //                                                 -82.413778,
    //                                                 23.118402
    //                                             ],
    //                                             'modifier': 'right',
    //                                             'type': 'turn',
    //                                             'instruction': 'Turn right onto Avenida Lázaro Cárdenas (41)'
    //                                         },
    //                                         'weight': 12.4,
    //                                         'duration': 4.9,
    //                                         'name': 'Avenida Lázaro Cárdenas (41)',
    //                                         'distance': 20.1
    //                                     },
    //                                     {
    //                                         'intersections': [
    //                                             {
    //                                                 'in': 0,
    //                                                 'entry': [
    //                                                     true
    //                                                 ],
    //                                                 'bearings': [
    //                                                     338
    //                                                 ],
    //                                                 'location': [
    //                                                     -82.413705,
    //                                                     23.118234
    //                                                 ]
    //                                             }
    //                                         ],
    //                                         'driving_side': 'right',
    //                                         'geometry': '}gblCtl_vN',
    //                                         'mode': 'cycling',
    //                                         'maneuver': {
    //                                             'bearing_after': 0,
    //                                             'bearing_before': 158,
    //                                             'location': [
    //                                                 -82.413705,
    //                                                 23.118234
    //                                             ],
    //                                             'type': 'arrive',
    //                                             'instruction': 'You have arrived at your destination'
    //                                         },
    //                                         'weight': 0,
    //                                         'duration': 0,
    //                                         'name': 'Avenida Lázaro Cárdenas (41)',
    //                                         'distance': 0
    //                                     }
    //                                 ],
    //                                 'distance': 1643
    //                             }
    //                         ],
    //                         'weight_name': 'cyclability',
    //                         'weight': 477.4,
    //                         'duration': 434.3,
    //                         'distance': 1643
    //                     }
    //                 ],
    //                 'waypoints': [
    //                     {
    //                         'distance': 4.290489621681565,
    //                         'name': 'Calle 10',
    //                         'location': [
    //                             -82.41868,
    //                             23.128191
    //                         ]
    //                     },
    //                     {
    //                         'distance': 4.189729389531439,
    //                         'name': 'Avenida Lázaro Cárdenas (41)',
    //                         'location': [
    //                             -82.413705,
    //                             23.118234
    //                         ]
    //                     }
    //                 ],
    //                 'code': 'Ok',
    //                 'uuid': 'cjsku0lut01xl42oqa4q8ea6g'
    //             };
    //         }
    //     }
    // });

    const itinerary = registry.itinerary = itineraryProvider(store);
    const navigation = registry.navigation = navigationProvider(store);
    const mapTools = registry.mapTools = mapToolProvider(registry);
    return registry;
};

export default provider();
