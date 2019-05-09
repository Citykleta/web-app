import {html, LitElement} from 'lit-element';
import {GeoLocation} from '../utils';
import {style} from './location-suggestion-item.style';

export const template = ({suggestion: val}) => {
    const text = val.name || (val.address && val.address.street) || 'Unknown place';
    const municipality = val.address && val.address.municipality;
    return html`${text}${municipality ? html`<span class="municipality">( ${municipality} )</span>` : ''} `;
};

export const propDef = {
    suggestion: {
        type: Object
    }
};

export class LocationSuggestionItem extends LitElement {

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    suggestion: GeoLocation = null;

    render() {
        return template(this);
    }
}

