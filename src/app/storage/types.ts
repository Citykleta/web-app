import {ApplicationState} from '../store/store';

export interface ApplicationStorage {
    set(state: ApplicationState): Promise<void>;

    get(): Promise<ApplicationState>;
}
