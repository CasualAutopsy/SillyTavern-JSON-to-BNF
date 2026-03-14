import {kobo} from '../../STLib-Kobo-API-Lib/expose.js';

async function importFromUrl(url, exportName, defaultValue = null) {
    try {
        const module = await import(/* webpackIgnore: true */ url);
        if (!Object.hasOwn(module, exportName)) {
            throw new Error(`No ${exportName} in module`);
        }
        return module[exportName];
    } catch (error) {
        console.error(`Failed to import ${exportName} from ${url}: ${error}`);
        return defaultValue;
    }
}

const [
    event_types,
    eventSource,
    saveSettingsDebounced,
    extension_settings,
    textgen_types,
    textgenerationwebui_settings,
    SlashCommandParser,
    SlashCommand,
    ARGUMENT_TYPE,
    SlashCommandArgument,
    SlashCommandNamedArgument
] = await Promise.all([
    importFromUrl('/script.js', 'event_types'),
    importFromUrl('/script.js', 'eventSource'),
    importFromUrl('/script.js', 'saveSettingsDebounced'),
    importFromUrl('/scripts/extensions.js', 'extension_settings'),
    importFromUrl('/scripts/textgen-settings.js', 'textgen_types'),
    importFromUrl('/scripts/textgen-settings.js', 'textgenerationwebui_settings'),
    importFromUrl('/scripts/slash-commands/SlashCommandParser.js', 'SlashCommandParser'),
    importFromUrl('/scripts/slash-commands/SlashCommand.js', 'SlashCommand'),
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'ARGUMENT_TYPE'),
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandArgument'),
    importFromUrl('/scripts/slash-commands/SlashCommandArgument.js', 'SlashCommandNamedArgument'),
]);


const SETTINGS_KEY = 'jsontobnf';

/**
 * Safely extracts BNF settings from extension settings.
 * Returns the settings object or empty object if not configured.
 */
function getBnfSettings() {
    const settings = extension_settings[SETTINGS_KEY];
    return typeof settings === 'object' ? settings : {};
}

/**
 * Normalizes URLs by removing trailing slashes.
 * Used before API calls to ensure consistent URL format.
 */
function normalizeUrl(url) {
    return url.replace(/\/+$/, '');
}

/**
 * Sets a temporary BNF grammar for the next generation request.
 * Cleared automatically after each generation completes.
 */
async function setTemporaryGrammar(_, value) {
    extension_settings[SETTINGS_KEY] = {
        "grammar": value,
        "grammar_string": value
    };
    saveSettingsDebounced();
}

/**
 * Clears the temporary BNF grammar setting.
 * Prevents state leakage between generation requests.
 */
function clearTemporaryGrammar() {
    extension_settings[SETTINGS_KEY] = '';
    saveSettingsDebounced();
}

/**
 * Registers event handlers for text and chat completion settings.
 *
 * Event Flow:
 * 1. TEXT_COMPLETION_SETTINGS_READY: Injects grammar settings into args
 * 2. CHAT_COMPLETION_SETTINGS_READY: Serializes settings into custom body
 * 3. After each event: Clears temporary BNF to prevent state leakage
 */
function registerEvents() {
    eventSource.on(event_types.TEXT_COMPLETION_SETTINGS_READY, (args) => {
        Object.assign(args, getBnfSettings());
        clearTemporaryGrammar();
    });

    eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, async (args) => {
        Object.assign(args, {'custom_include_body': JSON.stringify(getBnfSettings()) });
        clearTemporaryGrammar();
    });
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "json-to-grammar",
    callback: async (args, value) => {
        const result = await kobo.extra.jsontobnf(
            normalizeUrl(textgenerationwebui_settings.server_urls[textgen_types.KOBOLDCPP]),
            args.apikey,
            value
        );
        return result["result"];
    },
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'apikey',
            description: 'KoboldCpp API key',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false
        })
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'JSON Schema',
            typeList: [ARGUMENT_TYPE.DICTIONARY],
            isRequired: true,
        })
    ],
    splitUnnamedArgument: false,
    helpString: 'Convert JSON Schemas into BNF grammars using Kobold\'s `/api/extra/json_to_grammar` endpoint.',
    returns: 'BNF grammar string'
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "ephemeral-grammar",
    aliases: ["eph-bnf"],
    callback: setTemporaryGrammar,
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: "BNF grammar string",
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true
        })
    ],
    splitUnnamedArgument: false,
    helpString: 'Set the grammar string for the next generation request.\n(G/E)BNF Sampler parameters are reset upon finishing a gen request.'
}));

jQuery(async () => {
    registerEvents();
});
