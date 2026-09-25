// Register every persistent repository before MongoDB hydration. Commands also
// import these modules, but startup must not depend on which command files happen
// to load first: every operational collection should survive a redeploy.
import './access.repo';
import './afk.repo';
import './economy.repo';
import './group.repo';
import './groupstats.repo';
import './note.repo';
import './settings.repo';
import './tournament.repo';
import './user.repo';
import './voice.repo';
import './wallet.repo';
import './warn.repo';
