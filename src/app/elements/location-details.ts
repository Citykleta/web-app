import {html, LitElement} from 'lit-element';
import {formatAddress, GeoLocation, stringify, truncate} from '../utils';
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

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    location: GeoLocation = null;

    render() {
        return template(this);
    }
}

