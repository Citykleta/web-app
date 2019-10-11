import {html, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {debounce, SearchResult} from '../../utils';
import {loadingIndicator, myLocation} from '../../common/elements/icons';
import {style} from './search-box.style';
import {style as listboxStyle} from '../../common/elements/listbox.style';
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

const suggestionElement = (suggestion, index) => html`
<citykleta-listbox-option id="suggestion-${index}">
    ${createSearchResultInstance(suggestion).toOptionElement()}
</citykleta-listbox-option>`;

const template = ({
                      onSubmit,
                      onInput,
                      changeSelectedSuggestion,
                      valueString,
                      selectedIndex,
                      suggestions,
                      isBusy
                  }) => html`
<form @submit="${onSubmit}" aria-owns="place-suggestions-box" role="combobox" aria-expanded="${suggestions.length > 0}" aria-haspopup="listbox">
    <div id="loading-indicator" class="${classMap({hidden: !isBusy})}" aria-hidden="true">
        ${loadingIndicator()}
    </div>
    <input @input="${onInput}" .value="${valueString}" aria-controls="place-suggestions-box" type="search" placeholder="ex: teatro Karl Marx">
    <citykleta-button-icon label="select my location" id="my-location">${myLocation()}</citykleta-button-icon>
</form>
<citykleta-listbox @change="${ev => changeSelectedSuggestion(suggestions[ev.selectedIndex])}" .selectedIndex="${selectedIndex}">
${suggestions.map(suggestionElement)}
</citykleta-listbox>`;

const search = (fn, instance) => async function (query) {
    try {
        instance.isBusy = true;
        await fn(query);
        instance.suggestions = instance._search.getSearchResult();
    } catch (e) {
        instance.suggestions = [];
    } finally {
        instance.isBusy = false;
    }
};

export class SearchBox extends LitElement {
    value: SearchResult = null;
    selectedSuggestion: SearchResult = null;
    isBusy = false;
    private readonly _search: SearchService;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this._search = serviceRegistry.get('search');
        this.changeSelectedSuggestion = this.changeSelectedSuggestion.bind(this);
        this.addEventListener('keydown', this.handleKeyDown);
    }

    static get styles() {
        return [style, listboxStyle];
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
        const {suggestions, isBusy, changeSelectedSuggestion, selectedSuggestion, value} = this;
        const valueString = value === null ? '' : createSearchResultInstance(value).toString();
        const selectedIndex = suggestions.indexOf(selectedSuggestion);

        const onInput = debounce(() => {
            this.suggest(this.searchInput.value);
        });

        const onSubmit = (ev => {
            ev.preventDefault();
            this.submit(this.searchInput.value);
        });

        return template({
            onInput,
            onSubmit,
            changeSelectedSuggestion,
            suggestions,
            selectedIndex,
            valueString,
            isBusy: isBusy
        });
    }

    updated(changedProperties) {
        if (changedProperties.has('selectedSuggestion')) {
            this.searchInput.focus();
        }
    }

    private async suggest(query: string) {
        return search(this._search.searchPointOfInterest, this)(query);
    }

    private async submit(query) {
        return search(this._search.searchAddress, this)(query);
    }

    private changeSelectedSuggestion(value) {
        if (value) {
            this.selectedSuggestion = value || null;
            this._search.selectSearchResult(this.selectedSuggestion);
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
                //@ts-ignore
                // delegate to listbox
                this.shadowRoot.querySelector('citykleta-listbox')._handleKeydownEvent(ev);
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
