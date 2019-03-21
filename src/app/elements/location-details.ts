import {html, LitElement} from 'lit-element';
import {GeoLocation, truncate} from '../util';

export const template = ({location: val}) => {
    const text = val ? val.name || (val.address && val.address.street) || 'Unknown place' : 'N/A';
    return val === null ? html`` : html`
    <link rel="stylesheet" href="location-details.css">
    <h2>${text}</h2>
    <p>6, some bullshit address</p>
    <dl>
        <dt>Longitude</dt>
        <dd>${truncate(val.lng)}</dd>
        <dt>Latitude</dt>
        <dd>${truncate(val.lat)}</dd>
    </dl>`;
};

export const propDef = {
    location: {
        type: Object
    }
};

export class LocationDetails extends LitElement {

    static get properties() {
        return propDef;
    }

    location: GeoLocation = null;

    render() {
        return template(this);
    }
}

