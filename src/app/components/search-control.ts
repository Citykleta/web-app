import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {factory as searchBox} from './search-box';
import {isSameLocation, UIPoint} from '../util';
import {selectSuggestion} from '../actions/search';
import {template as locationItem} from './location-item';
import {runInNewContext} from 'vm';

const template = `<h2>Search location</h2>
<div class="tool-content">
<div id="upper-control">
<p class="info">Click on the map to get info about a location or use the search box to find matching locations.</p>
</div>
<div id="lower-control">

</div>
</div>`;

export const factory = (registry: ServiceRegistry): Component => {
    const {search, store} = registry;
    const domElement = document.createElement('DIV');
    const range = document.createRange();
    domElement.innerHTML = template;
    range.selectNodeContents(domElement);
    const locationDetails = domElement.querySelector('#lower-control');
    const upperControl = domElement.querySelector('#upper-control');

    const suggest = async (q: string) => {
        await search.search(q);
        return store.getState().search.suggestions;
    };

    const sb = searchBox(
        suggest,
        (p: UIPoint) => {
            search.selectSuggestion(p);
        }
    );

    upperControl.appendChild(sb.dom());

    let selectedLocation = null;
    const unsubscribe = store.subscribe(() => {
        const {search: {selectedSuggestion: newSelectedSuggestion}} = store.getState();
        if (!isSameLocation(newSelectedSuggestion, selectedLocation)) {
            if (!newSelectedSuggestion) {
                locationDetails.innerHTML = ''; // todo maybe we should start to use a framework to avoid this :) ...
            } else {
                locationDetails.innerHTML = locationItem(newSelectedSuggestion);
            }
            selectedLocation = newSelectedSuggestion;
        }
    });

    return {
        clean() {
            store.dispatch(selectSuggestion(null));
            unsubscribe();
        },
        dom() {
            return range.extractContents();
        }
    };
};
