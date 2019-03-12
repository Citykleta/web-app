import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {factory as searchBox} from './search-box';

const template = `<h2>Search location</h2>
<div class="tool-content">
<p class="info">Click on the map to get info about a location or use the search box to find matching locations.</p>
</div>`;

export const factory = (registry: ServiceRegistry): Component => {
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    const range = document.createRange();
    range.selectNodeContents(domElement);
    const toolContent = domElement.querySelector('.tool-content');

    const sb = searchBox(async (q) => new Promise(resolve => {
        setTimeout(() => resolve(['foo', 'bar', 'bim'].filter(word => q !== '' && word.includes(q))), 300);
    }));
    toolContent.appendChild(sb.dom());

    return {
        clean() {

        },
        dom() {
            return range.extractContents();
        }
    };
};
