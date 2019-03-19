import {Component} from './types';
import {debounce, GeoLocation, StatePoint, stringify, UIPoint} from '../util';

//todo
const loadingIndicator = `<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve">
  <path opacity="0.2" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946
    s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634
    c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"></path>
  <path d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0
    C22.32,8.481,24.301,9.057,26.013,10.047z">
    <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.5s" repeatCount="indefinite"></animateTransform>
    </path>
  </svg>`;

export const template = (p?: GeoLocation | StatePoint) => `<div aria-owns="place-suggestions-box" role="combobox" aria-expanded="false" aria-haspopup="listbox">
<div class="loading-indicator hidden" aria-hidden="true">
${loadingIndicator}
</div>
<input aria-controls="place-suggestions-box" value="${p ? stringify(p) : ''}" placeholder="ex: teatro karl Marx">
<button><span class="visually-hidden">Select My Location</span>O</button>
</div>
<ul role="listbox" id="place-suggestions-box"></ul>`;

interface Suggest<T> {
    (query: string): Promise<T[]    >;
}

interface SearchBoxController<T> {
    suggestions: T[];
    selectedSuggestion: T;
    value: T;
    isBusy: boolean;
    readonly suggester: Suggest<T>;

    suggest(query: string): Promise<T[]>;

    selectSuggestion(suggestion: T): void;

    selectPreviousSuggestion(): void;

    selectNextSuggestion(): void;
}

const SearchBoxControllerPrototype = {
    async suggest<T>(this: SearchBoxController<T>, query: string) {
        try {
            this.isBusy = true;
            this.suggestions = await this.suggester(query);
            this.selectedSuggestion = null;
        } catch (e) {
            this.suggestions = [];
        } finally {
            this.isBusy = false;
        }
        return this.suggestions;
    },
    selectSuggestion<T>(this: SearchBoxController<T>, suggestion: T) {
        if (this.suggestions.includes(suggestion)) {
            this.selectedSuggestion = suggestion;
        } else {
            this.selectedSuggestion = null;
        }
    },
    selectPreviousSuggestion<T>(this: SearchBoxController<T>) {
        if (this.selectedSuggestion) {
            const index = this.suggestions.indexOf(this.selectedSuggestion) - 1;
            const actualIndex = index >= 0 ? index : this.suggestions.length - 1;
            return this.selectSuggestion(this.suggestions[actualIndex]);
        } else {
            return this.selectSuggestion(this.suggestions[0]);
        }
    },
    selectNextSuggestion<T>(this: SearchBoxController<T>) {
        if (this.selectedSuggestion) {
            const index = this.suggestions.indexOf(this.selectedSuggestion) + 1;
            const actualIndex = index >= this.suggestions.length ? 0 : index;
            return this.selectSuggestion(this.suggestions[actualIndex]);
        } else {
            return this.selectSuggestion(this.suggestions[0]);
        }
    }
};

interface SuggestionsBoxInput<T> {
    suggest: Suggest<T>;
    onSelect: Function;
}

export interface SearchBoxComponent extends SearchBoxController<UIPoint>, Component {
}

export const searchBoxController = (input: SuggestionsBoxInput<UIPoint>, renderer): SearchBoxComponent => {
    let isBusy = false;
    let suggestions = [];
    let selectedSuggestion = null;
    let value = null;

    const render = () => renderer({
        isBusy,
        suggestions,
        selectedSuggestion,
        value
    });

    return Object.create(SearchBoxControllerPrototype, {
        suggester: {
            value: input.suggest
        },
        isBusy: {
            get() {
                return isBusy;
            },
            set(value: boolean) {
                if (value !== isBusy) {
                    isBusy = value;
                    render();
                }
            }
        },
        suggestions: {
            get() {
                return suggestions;
            },
            set(value: UIPoint[]) {
                suggestions = value;
                render();
            }
        },
        selectedSuggestion: {
            get() {
                return selectedSuggestion;
            },
            set(value: UIPoint) {
                if (value !== selectedSuggestion) {
                    selectedSuggestion = value;
                    input.onSelect(value);
                    render();
                }
            }
        },
        value: {
            get() {
                return value;
            },
            set(p: UIPoint) {
                if (value !== p) {
                    value = p;
                    render();
                }
            }
        }
    });
};

const createOption = (val: UIPoint, idx: number) => {
    const item = document.createElement('LI');
    item.setAttribute('role', 'option');
    item.setAttribute('id', `search-result-${idx}`);
    item.textContent = val.name || (val.address && val.address.street) || 'Unknown place';
    return item;
};

export interface SearchBoxComponentInput {
    suggest: Suggest<UIPoint>;
    onSelect: Function;
    value?: UIPoint;
}

export const factory = ({suggest, value: initialValue = null, onSelect}: SearchBoxComponentInput): SearchBoxComponent => {
    const container = document.createElement('div');
    container.classList.add('search-box');
    container.innerHTML = template();

    const comboBox = container.querySelector('[role=combobox]');
    const input = container.querySelector('input');
    const loadingIndicator = container.querySelector('.loading-indicator');
    const suggestionsList = container.querySelector('ul');

    let suggestionsElements = [];
    let suggestions = [];
    let currentValue = initialValue;

    const renderer = ({suggestions: newSuggestions, isBusy, value, selectedSuggestion}) => {
        loadingIndicator.classList.toggle('hidden', isBusy === false);
        if (suggestions.length !== newSuggestions.length || newSuggestions.some((s, i) => s !== suggestions[i])) {
            const range = document.createRange();
            range.selectNodeContents(suggestionsList);
            range.deleteContents();
            suggestions = newSuggestions;
            suggestionsElements = suggestions.map(createOption);
            for (const s of suggestionsElements) {
                suggestionsList.appendChild(s);
            }
            comboBox.setAttribute('aria-expanded', 'true');
        }

        const index = suggestions.indexOf(selectedSuggestion);

        suggestionsElements.forEach((el, i) => {
            el.setAttribute('aria-selected', i === index);
        });

        input.setAttribute('aria-activedescendant', index >= 0 ? suggestionsElements[index].getAttribute('id') : '');

        if (currentValue !== value) {
            currentValue = value;
            input.value = stringify(value);
        }
    };

    const instance = Object.assign(searchBoxController({
        suggest,
        onSelect
    }, renderer), {
        dom() {
            return container;
        },
        clean() {

        }
    });

    input.addEventListener('keydown', ev => {
        const {key} = ev;
        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                ev.preventDefault();
                if (key === 'ArrowDown') {
                    instance.selectNextSuggestion();
                } else {
                    instance.selectPreviousSuggestion();
                }
                break;
            }
            case 'Escape': {
                instance.selectSuggestion(null);
                break;
            }
            case 'Enter': {
                instance.value = instance.selectedSuggestion;
                instance.suggestions = [];
            }
        }
    });

    const handleInput = debounce(ev => {
        const {target} = ev;
        const {value} = target;
        return instance.suggest(value);
    });

    input.addEventListener('input', handleInput);

    return instance;
};
