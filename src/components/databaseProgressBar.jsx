import { Box, LinearProgress, Typography } from '@mui/material';
import { allGridColumnsSelector } from '@mui/x-data-grid';
import { ipcRenderer } from 'electron/renderer'

const gameCountStmt = db.prepare('SELECT COUNT (*) FROM games').pluck();
const conversionCountStmt = db.prepare('SELECT COUNT (*) FROM conversions').pluck();

class DatabaseProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gameCount: gameCountStmt.get(),
      conversionCount: conversionCountStmt.get(),
      current: undefined,
      max: undefined,
      windowCount: undefined
    }

    ipcRenderer.on('gameLoad', (event, args) => {
      this.setState(
        {
          gameCount: this.state.gameCount + 1,
          conversionCount: this.state.conversionCount + args.conversionsLoaded,
          current: args.gamesLoaded,
          max: args.max,
          windowCount: args.windowsLoaded
        })
    })

    ipcRenderer.on('windowCountChange', (event, args) => {
      this.setState({
        windowCount: args
      })
    })
  }

  componentDidMount() {
    ipcRenderer.invoke('startDatabaseLoad');
  }

  componentWillUnmount() {
  }

  linearProgressWithLabel() {
    let value = (this.state.current / this.state.max) * 100;

    return value >= 100
      ? <div>All {this.state.max} games loaded!</div>
      : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={value} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${this.state.current} of ${this.state.max} games loaded`}</Typography>
          </Box>
        </Box>
      );
  }

  render() {
    return (
      <div>
        <Box sx={{ width: '100%' }}>
          {this.state.gameCount} games and {this.state.conversionCount} conversions loaded
          {this.state.current && this.state.max && this.linearProgressWithLabel()}
        </Box>
        {this.state.windowCount > 0 && <div>{this.state.windowCount} workers loading games</div>}
      </div>
    );
  }
}


