import { Box, LinearProgress, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { allGridColumnsSelector } from '@mui/x-data-grid';
import { ipcRenderer } from 'electron/renderer'

const gameCountStmt = db.prepare('SELECT COUNT (*) FROM games').pluck();
const conversionCountStmt = db.prepare('SELECT COUNT (*) FROM conversions').pluck();
const errorStmt = db.prepare('SELECT * FROM errorGame');
class DatabaseProgressBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gameCount: gameCountStmt.get(),
      conversionCount: conversionCountStmt.get(),
      currentLoadCount: undefined,
      maxLoadCount: undefined,
      windowCount: undefined,
      errorGames: errorStmt.all()
    }

    ipcRenderer.on('gameLoad', (event, args) => {
      this.setState(
        {
          gameCount: gameCountStmt.get(),
          conversionCount: conversionCountStmt.get(),
          currentLoadCount: args.gamesLoaded
        })
    })
  }

  componentDidMount() {
    ipcRenderer.invoke('startDatabaseLoad').then((result) => {
      this.setState({
        maxLoadCount: result.max,
        currentLoadCount: result.gameCount
      })
    })
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('gameLoad');
  }

  linearProgressWithLabel() {
    let value = (this.state.currentLoadCount / this.state.maxLoadCount) * 100;

    return value >= 100
      ? <div>All {this.state.max} games loaded!</div>
      : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={value} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${this.state.currentLoadCount} of ${this.state.maxLoadCount} games loaded`}</Typography>
          </Box>
        </Box>
      );
  }

  render() {
    return (
      <div>
        <Box sx={{ width: '100%' }}>
          {this.state.gameCount} games and {this.state.conversionCount} conversions loaded
          {this.state.currentLoadCount && this.state.maxLoadCount && this.linearProgressWithLabel()}
          <div>
            {this.state.maxLoadCount === 0 && 'No new games found!'}
          </div>
        </Box>
      </div>
    );
  }
}


