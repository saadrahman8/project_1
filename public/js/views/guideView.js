/**
 * ARCHON DOCUMENTATION & HCI PRINCIPLES GUIDE
 * Interactive guide explaining the Shadow Privacy Algorithm,
 * Discrete/Ratio Math, and HCI usability foundations.
 */

const GuideView = {
  render(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 1000px; margin: 0 auto;">
        
        <!-- Hero Header -->
        <div class="card" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.12)); border-color: rgba(6, 182, 212, 0.3);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💡</div>
          <h2 class="card-title" style="font-size: 1.6rem;">Architecture & Human-Computer Interaction Guide</h2>
          <p class="card-subtitle" style="font-size: 0.95rem; line-height: 1.6;">
            Learn how ARCHON implements privacy-preserving shadow leaderboards, discrete delta mathematics, 
            Nielsen's 10 HCI heuristics, and secure zero-cost deployment.
          </p>
        </div>

        <!-- Section 1: The Shadow Privacy Algorithm -->
        <div class="card">
          <h3 class="card-title">🔒 1. The Shadow Leaderboard Privacy System</h3>
          <p class="text-secondary" style="margin: 0.5rem 0 1rem; font-size: 0.9rem;">
            When users log private workouts, traditional leaderboards either leak personal activity or ignore it completely. 
            ARCHON introduces a <strong>Dual-Consensus Shadow Ranking Model</strong>:
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin: 1.25rem 0;">
            <!-- Box 1 -->
            <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="color: var(--rose-private); margin-bottom: 0.5rem; font-size: 1rem;">User ABC's Personal View</h4>
              <ul style="font-size: 0.85rem; color: var(--text-secondary); padding-left: 1.2rem; line-height: 1.6;">
                <li>ABC's score combines <strong>both public + private logs</strong> (467 pts).</li>
                <li>Other athletes' scores are based only on their public records.</li>
                <li><strong>Result:</strong> ABC sees themselves positioned at <strong>Rank #8</strong>.</li>
                <li>Henry (360 pts) is seen right below ABC at <strong>Rank #9</strong>.</li>
              </ul>
            </div>

            <!-- Box 2 -->
            <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="color: var(--cyan-primary); margin-bottom: 0.5rem; font-size: 1rem;">Public Board (What Others See)</h4>
              <ul style="font-size: 0.85rem; color: var(--text-secondary); padding-left: 1.2rem; line-height: 1.6;">
                <li>ABC's private workouts are <strong>strictly omitted</strong>.</li>
                <li>Because ABC has no public entries, ABC is <strong>not shown on the board</strong>.</li>
                <li><strong>Result:</strong> Henry (who was 9th behind ABC) shifts into <strong>Rank #8</strong>!</li>
                <li>Zero private telemetry is leaked to the public.</li>
              </ul>
            </div>
          </div>

          <div style="background: var(--bg-surface); padding: 0.85rem 1.2rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary);">
            ⚡ <strong>Test it now:</strong> Click <strong>"User ABC"</strong> in the top bar to view Rank #8. Then click <strong>"🌐 Public View"</strong> or <strong>"Henry"</strong> to see Henry take Rank #8!
          </div>
        </div>

        <!-- Section 2: Discrete Numbers & Ratio Mathematics -->
        <div class="card">
          <h3 class="card-title">📈 2. Discrete Numbers vs Ratio Analytics</h3>
          <p class="text-secondary" style="margin: 0.5rem 0 1rem; font-size: 0.9rem;">
            Fitness improvements require evaluating both discrete physical units (absolute gains) and normalized ratios:
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md);">
              <h4 style="color: var(--emerald-success); font-size: 0.95rem; margin-bottom: 0.4rem;">Discrete Deltas (Δ)</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                <code>Δ Distance = Dist_curr - Dist_prev</code><br>
                Measures tangible mileage added (e.g. <strong>+5.4 km</strong>). Also computes duration delta (<strong>+45 min</strong>) and session counts.
              </p>
            </div>

            <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md);">
              <h4 style="color: var(--cyan-primary); font-size: 0.95rem; margin-bottom: 0.4rem;">Growth Ratios (%)</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                <code>Ratio = (Dist_curr / Dist_prev)</code><br>
                Normalized percentage change (e.g. <strong>+28.5%</strong> or <strong>1.28x</strong>), allowing fair comparison between novice and elite runners.
              </p>
            </div>

            <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md);">
              <h4 style="color: var(--amber-gold); font-size: 0.95rem; margin-bottom: 0.4rem;">Consistency Ratio</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                <code>Active Days / 7 Days = Ratio</code><br>
                Rewards workout frequency habits (e.g. 5 of 7 active days = <strong>71.4% consistency</strong>).
              </p>
            </div>
          </div>
        </div>

        <!-- Section 3: Jakob Nielsen's 10 HCI Principles Applied -->
        <div class="card">
          <h3 class="card-title">🎨 3. HCI Principles (Jakob Nielsen's Heuristics)</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; font-size: 0.85rem;">
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>1. Visibility of System Status:</strong> Real-time status banners, live personal vs public indicators, calculation previews while typing.
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>2. Match Between System and Real World:</strong> Intuitive sports iconography (🏃‍♂️, 🚴‍♂️, 🚶‍♂️), pace units (min/km), familiar podium awards.
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>3. User Control & Freedom:</strong> Edit and delete own scores at will, one-click toggle between Public and Personal shadow view.
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>4. Consistency & Standards:</strong> Unified design tokens, standard table layouts, consistent badge color coding (rose = private, cyan = public).
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>5. Error Prevention:</strong> HTML5 input constraints (min="0", min="1"), negative number rejection, confirmation prompts on record deletion.
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>6. Recognition Rather than Recall:</strong> Top demo switcher bar allows zero-friction account switching without remembering passwords.
            </div>
            <div style="padding: 0.6rem 0.85rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <strong>7. Flexibility & Efficiency:</strong> One-click "⚡ Compare" button on every leaderboard row jumps straight into Head-to-Head analytics.
            </div>
          </div>
        </div>

        <!-- Section 4: Security & Zero-Paid Deployment -->
        <div class="card">
          <h3 class="card-title">🛡️ 4. Security & Production Deployment</h3>
          <p class="text-secondary" style="font-size: 0.88rem; margin: 0.5rem 0 1rem; line-height: 1.6;">
            Built with 100% free and open-source technologies. No paid cloud services, proprietary APIs, or vendor lock-in:
          </p>
          <ul style="font-size: 0.85rem; color: var(--text-secondary); padding-left: 1.2rem; line-height: 1.6;">
            <li><strong>Strict Ownership Authorization:</strong> Users can ONLY edit and delete their own scores (HTTP 403 Forbidden enforced on foreign IDs).</li>
            <li><strong>Admin Role Enforcement:</strong> Only administrators can provision new activity types.</li>
            <li><strong>Password Protection:</strong> Salted Bcrypt hashing (10 rounds) + signed JWT tokens.</li>
            <li><strong>Zero SQL Injection:</strong> Better-SQLite3 prepared statements on 100% of queries.</li>
            <li><strong>Single-Command Deployment:</strong> Deployable via standard Docker container or Node.js runtime.</li>
          </ul>
        </div>
      </div>
    `;
  }
};
