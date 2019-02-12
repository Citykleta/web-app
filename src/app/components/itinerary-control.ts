import {ServiceRegistry} from '../services/service-registry';

const template = `
<h2>Itinerary</h2>
<div class="tool-content">
<label>
    <span>Destination :</span>
    <input type="search" placeholder="search a location" /> 
</label>
</div>
`;


export const factory = (registry: ServiceRegistry) => {
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    const range = document.createRange();
    range.selectNodeContents(domElement);
    return range.extractContents();
};

