import {html, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {debounce, GeoLocation, stringify} from '../utils';
import {loadingIndicator, myLocation} from './icons';
import {ServiceRegistry} from '../services/service-registry';
import {suggester} from '../services/search';
import {style} from './search-box.style';

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
    value: {type: Object}
};

export interface SuggestionFunction {
    (query: string): Promise<GeoLocation[]> | GeoLocation[];
}

export class SearchBox extends LitElement {

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    private getSearchInput() {
        if (this._searchInput) {
            return this._searchInput;
        }
        return this._searchInput = this.shadowRoot.querySelector('input');
    }

    private get selectedSuggestion() {
        return this._selectedSuggestion;
    }

    private set selectedSuggestion(value) {
        const oldValue = this._selectedSuggestion;
        this._selectedSuggestion = value;

        const event = new CustomEvent('selection-change', {
            detail: {
                suggestion: value
            }
        });
        this.dispatchEvent(event);
        this.focus();
        this.requestUpdate('selectedSuggestion', oldValue);
    }

    private readonly suggester: SuggestionFunction;
    private isBusy = false;
    private suggestions: GeoLocation[] = [];
    private value: GeoLocation = null;

    private _selectedSuggestion = null;
    private _searchInput = null;

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
                    this.selectedSuggestion = this.suggestions[actualIndex];
                }
                break;
            }
            case 'Escape': {
                this.selectedSuggestion = null;
                break;
            }
            case 'Enter': {
                if (this.selectedSuggestion) {
                    ev.preventDefault();
                    this.commitValue(this.selectedSuggestion);
                    this.suggestions = [];
                }
            }
        }
    }

    constructor(registry: ServiceRegistry) {
        super();
        this.suggester = suggester(registry);
        this.addEventListener('keydown', this.handleKeyDown);
    }

    async suggest(query: string) {
        try {
            this.isBusy = true;
            this.suggestions = await this.suggester(query);
            this.selectedSuggestion = null;
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
    }

    commitValue(newVal: GeoLocation) {
        this.value = newVal;
        this.getSearchInput().value = stringify(this.value);
        this.dispatchEvent(new CustomEvent('value-change', {
            detail: {
                value: newVal
            }
        }));
    }

    focus() {
        this.getSearchInput().focus();
    }

    render() {
        const {suggestions} = this;
        const valueString = stringify(this.value);
        const onInput = debounce(() => {
            this.suggest(this.getSearchInput().value); // this one needs a late binding.
        });
        const suggestionElements = suggestions.map((val, index) => {
            const onClick = () => {
                this.selectedSuggestion = val;
                this.commitValue(val);
            };
            return html`<li @click="${onClick}" role="option" aria-selected="${val === this.selectedSuggestion}" id="${`suggestion-${index}`}">
                <citykleta-location-suggestion .suggestion="${val}"></citykleta-location-suggestion>
            </li>`;
        });

        const onSubmit = (ev => {
            ev.preventDefault();
            this.dispatchEvent(new CustomEvent('search-submitted', {
                detail: {
                    value: this.getSearchInput().value
                }
            }));
            this.suggestions = [];
            this.selectedSuggestion = null;
        });

        return html`
<form @submit="${onSubmit}" aria-owns="place-suggestions-box" role="combobox" aria-expanded="${suggestions.length > 0}" aria-haspopup="listbox">
    <div id="loading-indicator" class="${classMap({hidden: !this.isBusy})}" aria-hidden="true">
        ${loadingIndicator()}
    </div>
    <input @input="${onInput}" .value="${valueString}" aria-controls="place-suggestions-box" type="search" placeholder="ex: teatro karl Marx">
    <citykleta-button-icon id="my-location">${myLocation()}</citykleta-button-icon>
</form>
<ol role="listbox" id="place-suggestions-box">
${suggestionElements}
</ol>
`;
    }
}
