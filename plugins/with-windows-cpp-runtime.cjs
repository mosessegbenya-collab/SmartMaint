const { withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');
const begin = '// @smartmaint/windows-cpp-runtime begin';
const end = '// @smartmaint/windows-cpp-runtime end';
function configure(contents) {
  const block = `${begin}
// Windows short compiler paths can omit clang++'s implicit shared C++ runtime.
// Keep the same NDK c++_shared runtime selected by React Native, explicitly linked.
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    subprojects { nativeProject ->
        ['com.android.library', 'com.android.application'].each { androidPlugin ->
            nativeProject.plugins.withId(androidPlugin) {
                // Apply after the application's DSL has finished setting its argument list.
                nativeProject.extensions.getByName('androidComponents').finalizeDsl { androidExtension ->
                    def runtimeArgument = '-DCMAKE_CXX_STANDARD_LIBRARIES=-lc++_shared -latomic -lm'
                    def cmakeArguments = androidExtension.defaultConfig.externalNativeBuild.cmake.arguments
                    if (!cmakeArguments.contains(runtimeArgument)) cmakeArguments.add(runtimeArgument)
                }
            }
        }
    }
}
${end}`;
  const first = contents.indexOf(begin); const last = contents.indexOf(end);
  if ((first >= 0) !== (last >= 0)) throw Error('Incomplete SmartMaint C++ runtime configuration; inspect before regeneration.');
  const original = first >= 0 ? contents.slice(0, first) + contents.slice(last + end.length) : contents;
  // React's root plugin evaluates :app while configuring library ordering. Register
  // before root plugins run so the app's finalizeDsl callback is not already past.
  const rootPlugin = original.search(/^apply plugin:\s*["'](?:expo-root-project|com\.facebook\.react\.rootproject)["']/m);
  return rootPlugin < 0 ? original.trimEnd() + '\n\n' + block + '\n'
    : original.slice(0, rootPlugin).trimEnd() + '\n\n' + block + '\n\n' + original.slice(rootPlugin).trim() + '\n';
}
function repairProperties(properties) {
  return properties.map((property) => {
    if (property.type !== 'property' || property.key !== 'expo.inlineModules.watchedDirectories') return property;
    // Recover the observed concatenation without enabling the inactive JVM suffix.
    const value = /^\[\]org\.gradle\.jvmargs=/.test(property.value) ? '[]' : property.value;
    let directories;
    try { directories = JSON.parse(value); } catch { throw Error('Expo inline-module directories must be a JSON array. Inspect the generated property before building.'); }
    if (!Array.isArray(directories) || directories.some((directory) => typeof directory !== 'string')) throw Error('Expo inline-module directories must contain only paths.');
    return { ...property, value };
  });
}
module.exports = (config) => withProjectBuildGradle(withGradleProperties(config, (mod) => {
  mod.modResults = repairProperties(mod.modResults); return mod;
}), (mod) => {
  if (mod.modResults.language !== 'groovy') throw Error('SmartMaint Windows runtime plugin expects the Expo Groovy root build script.');
  mod.modResults.contents = configure(mod.modResults.contents); return mod;
});
module.exports.configure = configure;
module.exports.repairProperties = repairProperties;
