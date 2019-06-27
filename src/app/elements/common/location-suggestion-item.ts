import {LitElement} from 'lit-element';
import {SearchResult} from '../../utils';
import {style} from './location-suggestion-item.style';
import {createSearchResultInstance} from '../search/search-result';

export const template = ({suggestion}) =>
    createSearchResultInstance(suggestion).toOptionElement();

export const propDef = {
    suggestion: {
        type: Object
    }
};

export class LocationSuggestionItem extends LitElement {

    suggestion: SearchResult = null;

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template({suggestion: this.suggestion});
    }
}

