import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {factory as searchBox} from './search-box';

const template = `<h2>Search location</h2>
<div class="tool-content">
<p class="info">Click on the map to get info about a location or use the search box to find matching locations.</p>
</div>`;

export const factory = (registry: ServiceRegistry): Component => {
    const {search, store} = registry;
    const domElement = document.createElement('DIV');
    const range = document.createRange();
    domElement.innerHTML = template;
    range.selectNodeContents(domElement);
    const toolContent = domElement.querySelector('.tool-content');

    const suggest = async (q: string) => {
        await search.search(q);
        return store.getState().search.suggestions;
    };

    const sb = searchBox(suggest);
    toolContent.appendChild(sb.dom());

    return {
        clean() {

        },
        dom() {
            return range.extractContents();
        }
    };
};
