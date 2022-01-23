module.exports = {
    packagerConfig: {
        asar: true
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "mcl"
            }
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: [
                "darwin"
            ]
        },
        {
            name: "@electron-forge/maker-deb",
            config: {}
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {}
        }
    ],
    publishers: [
        {
            name: "@electron-forge/publisher-github",
            platforms: [
                "win32"
              ],
            config: {
                repository: {
                    owner: "jakeyizle",
                    name: "mcl"
                }
            }
        }
    ]
}
