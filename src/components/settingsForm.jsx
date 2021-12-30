import { Box, Button, TextField } from "@mui/material";
const db = require('better-sqlite3')('melee.db');
const settingsStmt = db.prepare('SELECT value from settings where key = ?');
const settingsUpsert = db.prepare('INSERT INTO settings (key, value) values (@key, @value) ON CONFLICT (key) DO UPDATE SET value = @value');

class SettingsForm extends React.Component {
    constructor(props) {
        super(props);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.clickRefByName = this.clickRefByName.bind(this);
        this.replayPath = React.createRef();
        this.isoPath = React.createRef();
        this.dolphinPath = React.createRef();
        this.state = {
            replayPath: '',
            isoPath: '',
            dolphinPath: '',
            preRoll: '',
            postRoll: '',
            obsPassword: '',
            obsPort: ''
        }
    }

    componentDidMount() {
        for (const setting in this.state) {
            let value = settingsStmt.get(setting)?.value || '';
            this.setState({
                [setting]: value
            })
        }
    }
    handleInputChange(event) {
        const target = event.target;
        const name = target.name;
        let value;
        if (target.type === 'file') {
            const path = target.files[0].path;
            value = path;
            if (target.name === 'replayPath') {
                //get the directory of a file
                const regExp = /(.*\\)/;
                value = regExp.exec(path)[0];
            }
        } else {
            value = target.type === 'checkbox' ? target.checked : target.value;
        }

        this.setState({
            [name]: value
        })
        settingsUpsert.run( {key: name, value: value});
    }

    clickRefByName(inputName) {
        console.log(inputName);
        this[inputName].current.click();
    }

    render() {
        return (
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >

                <div>
                    {/*Material doesnt have a component that can do FOLDER input*/}
                    <input type="file" name="replayPath" webkitdirectory="true" ref={this.replayPath} onChange={this.handleInputChange} hidden />
                    <Button variant="outlined" onClick={(e) => this.clickRefByName('replayPath')}>Set Replay Path</Button>
                    {this.state.replayPath && <span>{this.state.replayPath}</span>}
                </div>
                <div>
                    <input type="file" name="isoPath" ref={this.isoPath} onChange={this.handleInputChange} hidden />
                    <Button variant="outlined" onClick={(e) => this.clickRefByName('isoPath')}>Set SSBM Iso Path</Button>
                    {this.state.isoPath && <span>{this.state.isoPath}</span>}
                </div>
                <div>
                    <input type="file" name="dolphinPath" ref={this.dolphinPath} onChange={this.handleInputChange} hidden />
                    <Button variant="outlined" onClick={(e) => this.clickRefByName('dolphinPath')}>Set Playback Dolphin Path</Button>
                    {this.state.dolphinPath && <span>{this.state.dolphinPath}</span>}
                </div>
                <div>
                    <TextField label="preRoll frames" type="number" placeholder="preRoll frames" onChange={this.handleInputChange} name="preRoll" value={this.state.preRoll} />
                </div>
                <div>
                    <TextField label="postRoll frames" type="number" placeholder="postRoll frames" onChange={this.handleInputChange} name="postRoll" value={this.state.postRoll} />
                </div>
                <div>
                    <TextField label="obsPassword" type="password" placeholder="obsPassword" onChange={this.handleInputChange} name="obsPassword" value={this.state.obsPassword} />
                </div>
                <div>
                    <TextField label="obsPort" type="number" placeholder="obsPort" onChange={this.handleInputChange} name="obsPort" value={this.state.obsPort} />
                </div>                
            </Box>

        )
    }
}