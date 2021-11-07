class ConversionTable extends React.Component {
    constructor(props) {
        super(props);
        this.onHeaderClick = this.onHeaderClick.bind(this);
    }

    onHeaderClick(field, event) {
        event.preventDefault();
        this.props.onSortChange(field);
    }

    render() {
        let headerCells = [];
        for (const field in this.props.conversions[0]) {
            headerCells.push(<th key={field} onClick={(e) => this.onHeaderClick(field, e)}>{field}</th>);
        }
        let bodyRows = [];
        for (let conversion of this.props.conversions) {
            let rowCells = [];
            for (const field in conversion) {
                rowCells.push(<td key={field}>{conversion[field]}</td>);
            }
            bodyRows.push(<tr key={conversion.id}>{rowCells}</tr>);
        }

        return (
            <table>
                <thead>
                    <tr>
                        {headerCells}
                    </tr>
                </thead>
                <tbody>{bodyRows}</tbody>
            </table>
        )
    }
}