import {html, LitElement} from 'lit-element';
import {style} from './location-details.style';
import {SearchResult, truncate} from '../../utils';
import {createSearchResultInstance} from './search-result';

export const template = ({location: val}) => {
    const searchResultInstance = createSearchResultInstance(val);
    const center = searchResultInstance.toPoint();
    return html`
<article>
    <h2><slot name="title"><span>${val.name}</span></slot></h2>
    <span>debug_category:${val.category}</span>
    ${val.description ? html`<p class="description">${val.description}</p>` : ''}
    <address>
        <slot name="address">${html`<div>${searchResultInstance.toOptionElement()}</div>`}</slot>
        <div class="location">
            <span>Location</span>:
            <span>${truncate(center.lng)} / ${truncate(center.lat)}</span>
        </div>
    </address>
<citykleta-actions-bar .location="${val}"></citykleta-actions-bar>
</article>`;
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
        return template({location: this.location});
    }
}

