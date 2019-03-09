import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';

const template = `<h2>Search location</h2>
<div class="tool-content">
<p>Click on the map to get info about a location or use the search box to find matching locations.</p>
</div>`;

export const factory = (registry: ServiceRegistry): Component => {
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    const range = document.createRange();
    range.selectNodeContents(domElement);

    return {
        clean() {

        },
        dom() {
            return range.extractContents();
        }
    };
};
