import {html, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {debounce, SearchResult} from '../../utils';
import {loadingIndicator, myLocation} from '../../common/elements/icons';
import {style} from './search-box.style';
import {SearchService} from '../service';
import {createSearchResultInstance} from './search-result';
import {ServiceRegistry} from '../../common/service-registry';

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

// todo remove dependency on store
export class SearchBox extends LitElement {
    value: SearchResult = null;
    selectedSuggestion: SearchResult = null;
    isBusy = false;
    private readonly _search: SearchService;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this._search = serviceRegistry.get('search');
        this.addEventListener('keydown', this.handleKeyDown);
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    private _suggestions: SearchResult[] = [];

    get suggestions() {
        return this._suggestions;
    }

    set suggestions(value) {
        const oldValue = this.suggestions;
        this._suggestions = value;
        // re init if search has switched the context
        if (!value.includes(this.selectedSuggestion)) {
            this.selectedSuggestion = null;
        }
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
    <input @input="${onInput}" .value="${valueString}" aria-controls="place-suggestions-box" type="search" placeholder="ex: teatro karl Marx">
    <citykleta-button-icon label="select my location" id="my-location">${myLocation()}</citykleta-button-icon>
</form>
<ol role="listbox" id="place-suggestions-box">
${suggestionElements}
</ol>
`;
    }

    updated(changedProperties) {
        if (changedProperties.has('selectedSuggestion')) {
            this.searchInput.focus();
        }
    }

    // todo refactor suggest & submit
    private async suggest(query: string) {
        try {
            this.isBusy = true;
            await this._search.searchPointOfInterest(query);
            this.suggestions = this._search.getSearchResult();
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
    }

    private async submit(value) {
        try {
            this.isBusy = true;
            await this._search.searchAddress(value);
            this.suggestions = this._search.getSearchResult();
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
