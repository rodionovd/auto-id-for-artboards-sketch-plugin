const { Document, Artboard } = require('sketch/dom')
const UI = require('sketch/ui')
const Settings = require('sketch/settings')
const util = require('util')
const { fnv1a } = require('./fnv1a')

const defaultProjectPrefix = "MYPROJ"

var onDocumentChanged = function (context) {
    util.toArray(context.actionContext).forEach(c => {
        if (c.object().isKindOfClass(NSClassFromString("MSArtboardGroup")) == false) {
            return;
        }
        // See https://developer.sketch.com/plugins/document-changes for details on change types
        const artboard = new Artboard({ sketchObject: c.object() });
        if (c.type() == 3 && !c.isMove()) {
            // a new artboard has been added
            return assignRandomIDToArtboard(artboard);
        }
        if (c.type() == 1 && c.propertyName() == "name") {
            // an artboard has been renamed
            return restoreIDNamePrefixForArtboardIfNeeded(artboard);
        }
    });
}

var updateProjectPrefix = function (_) {
    var document = Document.getSelectedDocument()
    var currentProjectPrefix = Settings.documentSettingForKey(document, 'project-prefix')

    UI.getInputFromUser("Choose a project prefix for this document", {
        initialValue: currentProjectPrefix ?? defaultProjectPrefix
    }, (error, value) => {
        if (error) {
            return
        }
        value = value.trim()
        Settings.setDocumentSettingForKey(document, 'project-prefix', value)

        UI.message(`✅ The project prefix for this document is now: "${value}"`)
    })
}

// ------------------
// MARK: - Operations
// ------------------

function stripExistingIDFromArtboardIfAny(artboard) {
    const uuid = artboardIDFromUserInfo(artboard);
    if (!uuid) {
        return;
    }
    const prefix = namePrefixForID(uuid);
    if (artboard.name.startsWith(prefix)) {
        artboard.name = artboard.name.slice(prefix.length)
    }
    saveArtboardIDInUserInfo(artboard, null);
}

function assignRandomIDToArtboard(artboard) {
    // in case we're dealing with a duplicate of an existing artboard
    stripExistingIDFromArtboardIfAny(artboard);
    const uuid = generateUniqueIDForArtboard(artboard);
    artboard.name = namePrefixForID(uuid) + artboard.name;
    saveArtboardIDInUserInfo(artboard, uuid);
}

function restoreIDNamePrefixForArtboardIfNeeded(artboard) {
    const uuid = artboardIDFromUserInfo(artboard);
    const expectedPrefix = namePrefixForID(uuid);
    // we trim the prefix to avoid re-installing it just because the trailing whitespace is deleted
    if (uuid && !artboard.name.startsWith(expectedPrefix.trim())) {
        artboard.name = expectedPrefix + artboard.name
    }
}

// ------------------
// MARK: - Utils
// ------------------

function generateUniqueIDForArtboard(artboard) {
    let document = artboard.parent.parent;
    let projectPrefix = Settings.documentSettingForKey(document, 'project-prefix');
    let meaningfulIDPart = fnv1a(artboard.id, { size: 32 }).toUpperCase();
    return `${projectPrefix ?? defaultProjectPrefix}-${meaningfulIDPart}`
}

function namePrefixForID(uuid) {
    return `[${uuid}] `
}

/** 
 * @param {object} artboard
 * @returns {string?}
 */
function artboardIDFromUserInfo(artboard) {
    let uuid = Settings.layerSettingForKey(artboard, 'uuid');
    if (!uuid && artboard.sketchObject && artboard.sketchObject.userInfo()) {
        // backwards compatibility with the previous version of the plugin
        return artboard.sketchObject.userInfo()['exposed.internals.auto-id-for-artboards.uuid'];
    }

    return uuid;
}

/** 
 * @param {object} artboard
 * @param {string?} uuid
 */
function saveArtboardIDInUserInfo(artboard, uuid) {
    Settings.setLayerSettingForKey(artboard, 'uuid', uuid)
}
