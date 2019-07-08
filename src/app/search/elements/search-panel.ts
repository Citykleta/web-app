import {html, LitElement} from 'lit-element';
import {SearchResult} from '../../utils';
import {style} from './search-panel.style';
import {SearchService} from '../service';
import {createSearchResultInstance} from './search-result';
import {ServiceRegistry} from '../../common/service-registry';

export const template = ({selectedSearchResult, isSearching, searchResult, onValue}) => {
    return html`
    <citykleta-search-box id="search-box" .isBusy="${isSearching}" .suggestions="${searchResult}" .selectedSuggestion="${selectedSearchResult}" @value-change="${onValue}"></citykleta-search-box>
    ${selectedSearchResult !== null ? createSearchResultInstance(selectedSearchResult).toDetailElement() : ''}
`;
};

export const propDef = {
    searchResult: {type: Array},
    selectedSearchResult: {type: Object},
    isSearching: {type: Boolean}
};

export class SearchPanel extends LitElement {

    private isSearching = false;
    private selectedSearchResult: SearchResult = null;
    private searchResult: SearchResult[] = [];
    private readonly _search: SearchService = null;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this._search = serviceRegistry.get('search');
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template({
            isSearching: this.isSearching,
            searchResult: this.searchResult,
            selectedSearchResult: this.selectedSearchResult,
            onValue: (ev: CustomEvent<{ value: SearchResult }>) => {
                this._search.selectSearchResult(ev.detail.value);
            }
        });
    }
}

