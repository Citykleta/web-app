import {html, LitElement} from 'lit-element';
import {formatAddress, SearchResult, truncate} from '../../utils';
import {style} from './location-details.style';

export const template = ({location: val}) => {
    const text = val ? val.name : 'Unknown place';
    const address = val && val.address ? formatAddress(val.address) : '';
    return val === null ? html`` : html`
    <header>
        <h2>${text}</h2>
    </header>
    <p>${address}</p>
    <p class="description">${val.description}</p>
    <p>debug category: ${val.category}</p>
    <p class="location">
        <span>Location</span>:
        <span>${truncate(val.lng)} / ${truncate(val.lat)}</span>
    </p>
`;
};

export const propDef = {
    location: {
        type: Object
    }
};

export class LocationDetails extends LitElement {

    location: SearchResult = null;

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template(this);
    }
}

