import {html, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {debounce, SearchResult} from '../../utils';
import {loadingIndicator, myLocation} from '../common/icons';
import {style} from './search-box.style';
import {SearchService} from '../../services/search';
import {ServiceRegistry} from '../../services/service-registry';
import {Store} from 'redux';
import {ApplicationState} from '../../services/store';
import {createSearchResultInstance} from './search-result';

export const propDef = {
    isBusy: {
        type: Boolean,
        attribute: false
    },
    suggestions: {
        type: Array,
        attribute: false
    },
    selectedSuggestion: {
        type: Object,
        attribute: false
    },
    value: {
        type: Object,
        attribute: false
    }
};

export class SearchBox extends LitElement {

    value: SearchResult = null;
    private isBusy = false;
    private selectedSuggestion: SearchResult = null;
    private _search: SearchService = null;
    private _store: Store<ApplicationState> = null;

    constructor({search, store}: ServiceRegistry) {
        super();
        this._search = search;
        this._store = store;
        this.addEventListener('keydown', this.handleKeyDown);
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    private _suggestions: SearchResult[] = [];

    private get suggestions() {
        return this._suggestions;
    }

    private set suggestions(value) {
        const oldValue = this.suggestions;
        this._suggestions = value;
        this.selectedSuggestion = null;
        this.requestUpdate('suggestions', oldValue);
    }

    private _searchInput = null;

    private get searchInput() {
        if (this._searchInput) {
            return this._searchInput;
        }
        return this._searchInput = this.shadowRoot.querySelector('input');
    }

    render() {
        const {suggestions} = this;
        const valueString = this.value === null ? '' : createSearchResultInstance(this.value).toString();
        const onInput = debounce(() => {
            this.suggest(this.searchInput.value);
        });
        const suggestionElements = suggestions.map((val, index) => {
            const onClick = () => {
                this.selectedSuggestion = val;
                this.commitValue(val);
            };
            return html`<li @click="${onClick}" role="option" aria-selected="${this.selectedSuggestion === val}" id="${index}">
                <citykleta-location-suggestion .suggestion="${val}"></citykleta-location-suggestion>
            </li>`;
        });

        const onSubmit = (ev => {
            ev.preventDefault();
            this.submit(this.searchInput.value);
        });

        return html`
<form @submit="${onSubmit}" aria-owns="place-suggestions-box" role="combobox" aria-expanded="${suggestions.length > 0}" aria-haspopup="listbox">
    <div id="loading-indicator" class="${classMap({hidden: !this.isBusy})}" aria-hidden="true">
        ${loadingIndicator()}
    </div>
    <input autofocus="true" @input="${onInput}" .value="${valueString}" aria-controls="place-suggestions-box" type="search" placeholder="ex: teatro karl Marx">
    <citykleta-button-icon label="select my location" id="my-location">${myLocation()}</citykleta-button-icon>
</form>
<ol role="listbox" id="place-suggestions-box">
${suggestionElements}
</ol>
`;
    }

    private async suggest(query: string) {
        try {
            this.isBusy = true;
            await this._search.searchPointOfInterest(query);
            this.suggestions = this._store.getState().search.searchResult;
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
    }

    private changeSelectedSuggestion(value) {
        this.selectedSuggestion = value;
        this._search.selectSearchResult(value);
    }

    private async submit(value) {
        try {
            this.isBusy = true;
            await this._search.searchAddress(value);
            this.suggestions = this._store.getState().search.searchResult;
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
    }

    private commitValue(newVal: SearchResult) {
        this.value = newVal;
        this.suggest('');
        this.dispatchEvent(new CustomEvent('value-change', {
            detail: {
                value: newVal
            }
        }));
    }

    private handleKeyDown(ev) {
        const {key} = ev;
        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                if (this.suggestions.length) {
                    ev.preventDefault();
                    const index = this.suggestions.indexOf(this.selectedSuggestion);
                    let actualIndex = index;
                    if (key === 'ArrowDown') {
                        actualIndex = index + 1 >= this.suggestions.length ? 0 : index + 1;
                    } else {
                        actualIndex = index - 1 >= 0 ? index - 1 : this.suggestions.length - 1;
                    }
                    this.changeSelectedSuggestion(this.suggestions[actualIndex]);
                }
                break;
            }
            case 'Escape': {
                this.suggest('');
                break;
            }
            case 'Enter': {
                if (this.selectedSuggestion) {
                    ev.preventDefault();
                    this.commitValue(this.selectedSuggestion);
                }
            }
        }
    }
}
