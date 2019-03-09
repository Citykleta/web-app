import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {factory as stopPointFactory} from './itinerary-stop-point';

const template = `
<h2>Itinerary</h2>
<div class="tool-content">
<p>Click on the map to add way points</p>
<ul class="itinerary-stop-point-container">
    
</ul>
</div>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {store, itinerary} = registry;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    const range = document.createRange();
    range.selectNodeContents(domElement);
    const stopListElements = domElement.querySelector('ul');

    const itineraryStopChangedHandler = () => {
        // todo update only when required
        const {stops} = store.getState().itinerary;
        const r = document.createRange();
        range.selectNodeContents(stopListElements);
        range.deleteContents();

        for (const stop of stops) {
            stopListElements.appendChild(stopPointFactory(registry, stop).dom());
        }
    };

    const unsubscribe = store.subscribe(itineraryStopChangedHandler);

    return {
        clean() {
            unsubscribe();
            itinerary.reset();
        },
        dom() {
            return range.extractContents();
        }
    };
};

