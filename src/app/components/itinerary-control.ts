import {ServiceRegistry} from '../services/service-registry';
import {Events, ItineraryState} from '../services/store';
import {Component} from './interfaces';
import {factory as stopPointFactory} from './itinerary-stop-point';

const template = `
<h2>Itinerary</h2>
<div class="tool-content">
<p>Click on the map to add way points</p>
<ul>
    
</ul>
</div>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {store} = registry;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    const range = document.createRange();
    range.selectNodeContents(domElement);
    const stopListElements = domElement.querySelector('ul');

    const itineraryStopChangedHandler = (itineraryState: ItineraryState) => {
        const {stops} = itineraryState;
        const r = document.createRange();
        range.selectNodeContents(stopListElements);
        range.deleteContents();
        for (const stop of stops) {
            stopListElements.appendChild(stopPointFactory(registry, stop).dom());
        }
    };

    store.on(Events.ITINERARY_STOPS_CHANGED, itineraryStopChangedHandler);

    return {
        clean() {
            store.off(Events.ITINERARY_STOPS_CHANGED, itineraryStopChangedHandler);
        },
        dom() {
            return range.extractContents();
        }
    };
};

