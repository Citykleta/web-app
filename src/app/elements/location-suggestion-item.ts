import {html, LitElement} from 'lit-element';
import {GeoLocation} from '../util';

export const template = ({suggestion: val}) => {
    const text = val.name || (val.address && val.address.street) || 'Unknown place';
    return html`${text}`;
};

export const propDef = {
    suggestion: {
        type: Object
    }
};

export class LocationSuggestionItem extends LitElement {

    static get properties() {
        return propDef;
    }

    suggestion: GeoLocation = null;

    render() {
        return template(this);
    }
}

