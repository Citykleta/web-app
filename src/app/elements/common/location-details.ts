import {html, LitElement} from 'lit-element';
import {SearchResult, truncate} from '../../utils';
import {style} from './location-details.style';
import {createSearchResultInstance} from '../search/search-result';

export const template = ({location: val}) => {
    if (val === null)
        return html``;

    const instance = createSearchResultInstance(val);
    const center = instance.toPoint();
    return html`
    <header>
        <h2>${instance.header()}</h2>
    </header>
    ${val.description ? html`<p class="description">${val.description}</p>` : ''}
    ${val.category ? html`<p>debug category: ${val.category}</p>` : ''}
    <address>${instance.address()}
        <div class="location">
            <span>Location</span>:
            <span>${truncate(center.lng)} / ${truncate(center.lat)}</span>
        </div>
    </address>
    <citykleta-actions-bar .location="${val}"></citykleta-actions-bar>`;
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

