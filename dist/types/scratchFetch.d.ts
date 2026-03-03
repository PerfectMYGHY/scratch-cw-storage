/**
 * Metadata header names
 * @enum {string} The enum value is the name of the associated header.
 * @readonly
 */
declare const RequestMetadata: {
    /** The ID of the project associated with this request */
    ProjectId: string;
    /** The ID of the project run associated with this request */
    RunId: string;
};
/**
 * Metadata header names
 * @enum {string} The enum value is the name of the associated header.
 * @readonly
 */
interface RequestMetadata {
    /** The ID of the project associated with this request */
    ProjectId: 'X-Project-ID';
    /** The ID of the project run associated with this request */
    RunId: 'X-Run-ID';
}
/**
 * Non-destructively merge any metadata state (if any) with the provided options object (if any).
 * If there is metadata state but no options object is provided, make a new object.
 * If there is no metadata state, return the provided options parameter without modification.
 * If there is metadata and an options object is provided, modify a copy and return it.
 * Headers in the provided options object may override headers generated from metadata state.
 * @param {RequestInit} [options] The initial request options. May be null or undefined.
 * @returns {RequestInit|undefined} the provided options parameter without modification, or a new options object.
 */
declare const applyMetadata: (options: RequestInit) => RequestInit | undefined;
/**
 * Make a network request.
 * This is a wrapper for the global fetch method, adding some Scratch-specific functionality.
 * @param {RequestInfo|URL} resource The resource to fetch.
 * @param {RequestInit} options Optional object containing custom settings for this request.
 * @see {@link https://developer.mozilla.org/docs/Web/API/fetch} for more about the fetch API.
 * @returns {Promise<Response>} A promise for the response to the request.
 */
declare const scratchFetch: (resource: RequestInfo | URL, options: RequestInit) => Promise<Response>;
/**
 * Set the value of a named request metadata item.
 * Setting the value to `null` or `undefined` will NOT remove the item.
 * Use `unsetMetadata` for that.
 * @param {string} name The name of the metadata item to set.
 * @param {string} value The value to set (will be converted to a string).
 */
declare const setMetadata: (name: string, value: string) => void;
/**
 * Remove a named request metadata item.
 * @param {string} name The name of the metadata item to remove.
 */
declare const unsetMetadata: (name: string) => void;
/**
 * Retrieve a named request metadata item.
 * Only for use in tests. At the time of writing, used in scratch-vm tests.
 * @param {string} name The name of the metadata item to retrieve.
 * @returns {string | null} value The value of the metadata item, or `undefined` if it was not found.
 */
declare const getMetadata: (name: string) => string | null;
declare const exportData: {
    Headers: {
        new (init?: HeadersInit): Headers;
        prototype: Headers;
    };
    RequestMetadata: {
        /** The ID of the project associated with this request */
        ProjectId: string;
        /** The ID of the project run associated with this request */
        RunId: string;
    };
    applyMetadata: (options: RequestInit) => RequestInit | undefined;
    scratchFetch: (resource: RequestInfo | URL, options: RequestInit) => Promise<Response>;
    setMetadata: (name: string, value: string) => void;
    unsetMetadata: (name: string) => void;
    getMetadata: (name: string) => string | null;
};
type ExportHeaders = Headers;
export { exportData as default, ExportHeaders as Headers, RequestMetadata, applyMetadata, scratchFetch, setMetadata, unsetMetadata, getMetadata };
