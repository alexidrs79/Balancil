import { ChevronRight } from '../../components/icons';
import { Link } from 'react-router-dom';

export function HelpSettings() {
  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Help & legal</h2>
        <p>Understand how your ledger works and review Balancil’s policies.</p>
      </header>
      <div className="settings-resource-list">
        <Link to="/app/help/privacy">
          <span>
            <strong>Privacy policy</strong>
            <small>How account and ledger data are handled.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
        <Link to="/app/help/terms">
          <span>
            <strong>Terms of use</strong>
            <small>The rules and limitations for using Balancil.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
        <Link to="/app/help/ledger-basics">
          <span>
            <strong>Ledger basics</strong>
            <small>Add, filter, and maintain your transaction history.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
