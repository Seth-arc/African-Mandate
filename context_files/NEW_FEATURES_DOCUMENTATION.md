# African Mandate: Sahel Arena - Complete Feature Documentation

## 🎯 Overview
This document details the three major interactive systems added to the African Mandate gameplay interface: **Intelligence Reports**, **Actor Dialogue**, and **Character Profile**.

---

## 📰 1. Intelligence Report System

### **Purpose**
Transform brief intelligence feed items into fully-detailed newspaper-style reports that give players comprehensive situation analysis and strategic guidance.

### **Visual Design: Newspaper Aesthetic**
- **Masthead**: "Sahel Intelligence Brief" in elegant serif font with gold accent
- **Layout**: Two-column newspaper format for readability
- **Typography**: Drop cap on first paragraph, justified text, serif body font
- **Header**: Dark background with urgent badge (rotated 3°)
- **Featured Image**: 400px height with gradient overlay and caption
- **Sections**: Pull quotes, infoboxes, bulleted lists for structured information
- **Footer**: Source citations and action buttons

### **Available Reports**

#### **1. Wagner Group in Burkina Faso (wagner)**
- **Urgency**: Immediate Action Required
- **Threat**: High
- **Image**: 🛡️
- **Key Content**:
  - 200-300 Wagner contractors identified near Ouahigouya
  - Represents fundamental shift in regional security architecture
  - Timeline: Dec 2021 (Mali arrival) → Jan 2026 (Burkina expansion)
  - Pull Quote: "Wagner's expansion threatens to undermine African-led security frameworks"
  - Infobox: Wagner Group timeline in Sahel
  - Strategic Implications: Russian alternative to Western partnerships
  - Recommended Actions: 5 specific AU response strategies
- **Sources**: AU Regional Bureau, ECOWAS, National Intelligence Services, Satellite Imagery

#### **2. ECOWAS Summit Postponed (ecowas)**
- **Urgency**: Diplomatic Priority
- **Threat**: Medium
- **Image**: 🌍
- **Key Content**:
  - Summit postponed due to fundamental disagreements
  - Alliance of Sahel States rejecting ECOWAS authority
  - Legitimacy crisis: sanctions vs. engagement paradox
  - Pull Quote: "We cannot bomb our way to democracy"
  - Infobox: Member state positions (Nigeria, Senegal, Ghana, etc.)
  - Strategic Recommendations: AU-ECOWAS alignment strategies
- **Sources**: ECOWAS Communications, AU Peace & Security Council, Regional Media

#### **3. Climate Crisis Accelerating (climate)**
- **Urgency**: Long-term Systemic
- **Threat**: Critical
- **Image**: 🌾
- **Key Content**:
  - 40% agricultural yield decline
  - 11 million people facing food insecurity
  - Climate-security feedback loop analysis
  - Pull Quote: "Cannot separate climate policy from security policy"
  - Infobox: Climate impact by territory (Mali 3.2M, Burkina 2.7M, Niger 4.1M, Chad 2M)
  - Required Response: 6 comprehensive approaches
- **Sources**: AU Climate Observatory, UN FAO, World Food Programme

#### **4. French Military Withdrawal (french)**
- **Urgency**: Immediate
- **Threat**: High
- **Image**: 🎖️
- **Key Content**:
  - Final 1,500 troops withdrawing by March 2026
  - Operation Barkhane complete end
  - Security vacuum analysis
  - Infobox: Post-Barkhane landscape (G5 Sahel, Wagner, ECOWAS, National Armies)
  - Pull Quote: "The French departure is both opportunity and crisis"
  - Strategic Imperatives: 6 AU priority actions
  - 90-day window for AU to demonstrate capacity
- **Sources**: French Ministry of Defense, AU Regional Bureau, G5 Sahel Secretariat

### **User Interaction Flow**
1. **Click Intelligence Item** → Right sidebar intel feed
2. **Report Opens** → Full-screen newspaper-style modal
3. **Read Analysis** → Scroll through structured content
4. **Review Recommendations** → Strategic guidance section
5. **Take Action** → Action button or Close

### **HTML Structure**
```html
<div class="intel-report-overlay" id="intelReportOverlay">
  <div class="intel-report-modal">
    <div class="intel-report-header">...</div>
    <div class="intel-report-content">
      <div class="intel-report-lead-image">...</div>
      <div class="intel-report-body">...</div>
    </div>
    <div class="intel-report-footer">...</div>
  </div>
</div>
```

### **JavaScript Functions**
- `showIntelReport(reportKey)` - Opens report modal with data from `intelReports` object
- `closeIntelReport()` - Closes modal
- Auto-population of headline, subheadline, images, meta data, body content, sources

---

## 💬 2. Actor Dialogue System

### **Purpose**
Enable diplomatic engagement with key stakeholders through branching dialogue choices that affect game metrics and relationships.

### **Visual Design**
- **Header**: Large avatar (80px), actor name in serif font, faction badge
- **Relationship Meter**: Gradient bar showing current standing (20% hostile → 50% neutral → 80% allied)
- **Message**: Large italic quote in styled box
- **Options**: 4 choice cards with icon, title, description, and consequence tags
- **Hover Effect**: Cards translate right with left gold accent bar

### **Actor Dialogues**

#### **1. Col. Assimi Goïta (Mali Junta)**
- **Avatar**: 🇲🇱
- **Title**: Chairman, National Committee for the Salvation of the People
- **Relationship**: Neutral • Cautious
- **Message**: *"Mali's sovereignty is not negotiable. We've seen what external interventions achieve—dependency and resentment."*
- **Context**: Consolidated power since 2021 coup, aligning with Russia/Wagner, under ECOWAS sanctions
- **Dialogue Options**:
  1. 🤝 **Appeal to Pan-African Unity** (+15 Political Capital, Improves Relationship, Slow Progress)
  2. ⚖️ **Acknowledge Past Failures** (+20 Political Capital, Strong Trust, -5M Budget)
  3. 🎯 **Focus on Mutual Security** (+10 Political Capital, Security Cooperation, Wagner Complications)
  4. 💰 **Offer Economic Incentives** (+25 Political Capital, -15M Budget, Conditional Progress)

#### **2. JNIM Leadership (Jihadist Group)**
- **Avatar**: ⚔️
- **Title**: Jama'at Nusrat al-Islam wal-Muslimin (Al-Qaeda Affiliate)
- **Relationship**: Hostile • Uncompromising
- **Message**: *"Your secular governments are corrupt, borders are colonial impositions. There can be no peace while injustice prevails."*
- **Context**: 2,000+ fighters, exploiting governance failures, led by Iyad Ag Ghaly
- **Dialogue Options**:
  1. 🕊️ **Explore Back-Channel Communication** (+5 Intel, -20 Political Capital Controversial, Potential Ceasefires)
  2. 🎯 **Address Root Grievances** (+10 Civilian Support, Long-term De-escalation, No Immediate Impact)
  3. ⚡ **Highlight Movement Divisions** (+15 Intel, Splinter Negotiations, Hardliner Retaliation Risk)
  4. 🛡️ **Reject Engagement Entirely** (+15 Global Legitimacy, Closes Diplomacy, Escalates Conflict)

#### **3. ECOWAS Commission (Regional Bloc)**
- **Avatar**: 🌍
- **Title**: Economic Community of West African States
- **Relationship**: Allied • Strained
- **Message**: *"We need more than words. Our sanctions policy is failing. Member states are divided. Help us find a new approach."*
- **Context**: Existential crisis, alternative alliance forming (Mali/Burkina/Niger), sanctions ineffective
- **Dialogue Options**:
  1. 🤝 **Propose Joint AU-ECOWAS Framework** (+30 Political Capital, +20 Global Legitimacy, Strengthens Synergy)
  2. 🔄 **Advocate Policy Pivot** (+25 Political Capital, -10 Global Legitimacy, Opens Junta Dialogue)
  3. 💪 **Support Hardline Stance** (+30 Global Legitimacy, -25 Political Capital, Risks Fracture)
  4. 🎯 **Focus on Security First** (+20 Political Capital, -15 Global Legitimacy, Military Cooperation)

#### **4. Tuareg Coalition (Ethnic Militia)**
- **Avatar**: 🏜️
- **Title**: Coordination of Azawad Movements (CMA)
- **Relationship**: Neutral • Negotiable
- **Message**: *"Decades of marginalization by Bamako. We seek autonomy for Azawad. Help broker real solution or watch us fight."*
- **Context**: Pre-dates Sahel crisis, 2015 Algiers Accord stalled, complex factional loyalties
- **Dialogue Options**:
  1. 📜 **Revive Algiers Accord** (+30 Political Capital, +15 Regional Synergy, Mali Resistance)
  2. 💼 **Focus on Economic Development** (+20 Civilian Support, -10M Budget, Long-term Trust)
  3. 🛡️ **Integrate Forces into National Army** (+25 Political Capital, Reduced Insurgency, Implementation Risks)
  4. ⚠️ **Warn Against Jihadist Alliance** (+15 Global Legitimacy, -15 Political Capital, Forces CMA Choice)

#### **5. Wagner Group (PMC)**
- **Avatar**: 🇷🇺
- **Title**: Private Military Contractor
- **Relationship**: Adversarial • Uncooperative
- **Message**: *"We operate at invitation of sovereign governments. What they do with their security partnerships is not AU business."*
- **Context**: Intentional opacity, Russian geopolitical interests, mixed operational record
- **Dialogue Options**:
  1. 📋 **Document Human Rights Violations** (+10 Global Legitimacy, +10 Intel, Wagner Hostility)
  2. 🎯 **Highlight Operational Failures** (+15 Intel, Weakens Wagner Reputation, No Immediate Effect)
  3. 🤐 **Avoid Direct Engagement** (+5 Global Legitimacy, No Change, Focuses on Alternatives)
  4. 💥 **Threaten Accountability** (+20 Global Legitimacy, Russian Diplomatic Pressure, Long-term Legal)

### **Consequence System**
- **Positive Effects** (green): +Political Capital, +Legitimacy, +Civilian Support
- **Negative Effects** (red): -Budget, -Political Capital, Risks/Complications
- **Neutral Effects** (gray): Conditional, Long-term, Potential outcomes

### **User Interaction Flow**
1. **Click Actor Card** → Right sidebar
2. **Dialogue Opens** → Full actor profile with message
3. **Review Context** → Understand actor's position and motivations
4. **Choose Response** → Select 1 of 4 dialogue options
5. **Effects Applied** → Game metrics update, notification shows results

### **JavaScript Functions**
- `determineActorKey(actorCard)` - Identifies which actor was clicked
- `showActorDialogue(actorKey)` - Opens dialogue modal with actor data
- `handleDialogueChoice(actorKey, optionIndex)` - Processes choice and updates game state
- `closeActorDialogue()` - Closes modal

---

## 👤 3. Character Profile System

### **Purpose**
Allow players to learn about their own character's background, motivation, expertise, and mandate—building immersion and contextualizing decisions.

### **Visual Design**
- **Header**: Dark gradient background with gold accents
- **Badge**: Top-right "Special Envoy" rank badge
- **Stats Grid**: 4 career statistics (Years, Crises, Ceasefires, Success Rate)
- **Timeline**: Vertical timeline with gold dots and connecting line
- **Sections**: Background, Education, Career, Motivation, Relationships, Mandate

### **Character Profile Content**

#### **Career Statistics**
- **12 Years** Experience
- **8 Crises** Managed
- **3 Ceasefires** Brokered
- **92% Mission** Success Rate

#### **Background & Origin**
Born in Sahelian capital during stability period. Family straddled urban/rural worlds. Age 12: fled violence, 18 months in IDP camp. Displacement experience shaped career—witnessed well-meaning but culturally-ignorant international aid, traditional conflict resolution dismissed, learned sustainable solutions must emerge from within communities.

#### **Education & Training**
- **University of Dakar**: BA Political Science (First Class Honors) - Focus on post-colonial governance and traditional African conflict resolution
- **London School of Economics**: MSc Conflict, Security, and Development - Thesis: "Beyond Military Intervention: Community-Centered Approaches to Sahel Security"
- **Additional Training**: Crisis negotiation (Harvard), Regional security frameworks (AU), Climate security (Stockholm)

#### **Career Timeline**
- **2014**: Breakthrough mediation - Fulani/Dogon ceasefire, prevented wider ethnic conflict
- **2016-2018**: Regional Stabilization Coordinator - Lake Chad Basin multi-stakeholder initiative
- **2018**: Published influential research challenging prevailing security paradigms
- **2020-2025**: Senior Advisor to AU Commissioner for Peace and Security - Strategic frameworks across Somalia, DRC, Sudan
- **January 2026**: Appointed first-ever Special Envoy for Sahel Stabilization

#### **Personal Motivation**
- **Grandmother**: Traditional conflict mediator, taught wisdom of cultural intelligence
- **University Friend**: Lost to jihadist attack in Ouagadougou café, reinforced determination to address root causes not symptoms
- **Core Belief**: African problems require African solutions—sustainable peace must be owned by those living with consequences

#### **Key Relationships**
- **Dr. Amina Konaté** (Mentor): Former AU Special Representative, taught balance of idealism/pragmatism, now retired trusted advisor
- **Ibrahim Salifu** (Ally): ECOWAS Director of Political Affairs, shares vision of engagement over isolation, provides intelligence and political cover
- **Col. Jean-Baptiste Dubois** (Rival): French military advisor, represents traditional intervention approaches player opposes, personally cordial but professionally adversarial
- **Fatima Diallo** (Protégé): Young analyst mentee, brings fresh perspectives and challenges assumptions

#### **Mandate & Authority**
- **Budget**: $150M annual for Sahel operations
- **Negotiation Authority**: Can engage all parties including non-state actors
- **Deployment Power**: Can deploy AU personnel/resources without additional approval
- **Coordination Authority**: Over ECOWAS, G5 Sahel, bilateral partnerships
- **Reporting Line**: Direct to AU Peace and Security Council
- **Emergency Powers**: Can respond to immediate crises
- **Experimental Nature**: Success/failure will shape African security architecture for decades

### **User Interaction Flow**
1. **Click "Your Character"** → Header button
2. **Profile Opens** → Full modal with all sections
3. **Scroll Through** → Read background, timeline, relationships, mandate
4. **Close** → Return to gameplay

### **HTML Structure**
- Header with badge and 4 statistics
- Content with 6+ sections
- Timeline with vertical dots and connecting line
- Footer with close button

### **JavaScript Functions**
- `showCharacterProfile()` - Opens character profile modal
- `closeCharacterProfile()` - Closes modal

---

## 🎮 Complete User Experience Flow

### **Scenario: Wagner Group Intelligence**

**Step 1**: Player notices red urgent intel item in right sidebar
```
[3 hours ago] Wagner Group contractors spotted in northern Burkina Faso...
```

**Step 2**: Clicks intel item → Full newspaper-style report opens

**Step 3**: Reads comprehensive analysis:
- Headline: "Wagner Group Contractors Spotted in Northern Burkina Faso"
- 200-300 contractors identified
- Strategic implications of Russian security alternative
- Timeline from 2021 Mali to 2026 Burkina expansion
- Pull quote from AU analyst
- Infobox with Wagner timeline
- 5 recommended AU responses

**Step 4**: Decides to engage Mali's junta leader

**Step 5**: Scrolls right sidebar, clicks "Col. Assimi Goïta" actor card

**Step 6**: Dialogue modal opens:
- Goïta: *"Mali's sovereignty is not negotiable..."*
- Context: Coup consolidation, Wagner alignment, ECOWAS sanctions
- 4 response options visible

**Step 7**: Reviews options:
- Pan-African Unity: +15 Political Capital, slow progress
- Acknowledge Failures: +20 Political Capital, -5M Budget, strong trust
- Mutual Security: +10 Political Capital, Wagner complications
- Economic Incentives: +25 Political Capital, -15M Budget, conditional

**Step 8**: Chooses "Acknowledge Past Failures"

**Step 9**: Game updates:
- Political Capital: 45 → 65
- Budget: $85M → $80M
- Notification: "Goïta appreciates honesty. Tentative cooperation established."

**Step 10**: Wants to understand own background/authority

**Step 11**: Clicks "Your Character" in header

**Step 12**: Profile modal opens showing:
- 12 years experience, 8 crises managed
- IDP camp experience shaped approach
- LSE thesis on community-centered security
- 2014 breakthrough Fulani-Dogon mediation
- Grandmother's influence as traditional mediator
- $150M budget and direct AU Council authority

**Step 13**: Player now understands:
- Why they oppose external military interventions (personal history)
- Their legitimacy to negotiate with all parties (mandate)
- The high stakes of their decisions (experimental nature)

**Result**: Player has full strategic context, understands character motivation, and made informed diplomatic choice affecting game state.

---

## 📂 File Locations

- **HTML**: `/mnt/user-data/outputs/gameplay-interface-final.html`
- **JavaScript**: `/mnt/user-data/outputs/script-final.js`
- **Documentation**: This file

---

## 🔧 Technical Implementation Notes

### **CSS Architecture**
- Newspaper aesthetic: serif fonts, two-column layout, justified text
- Relationship meters: Gradient fills with smooth transitions
- Timeline styling: Vertical dots with connecting line
- Modal overlays: High z-index (2500+), blur backdrop, smooth animations

### **JavaScript Data Structures**
```javascript
intelReports = {
  wagner: { headline, subheadline, source, location, threat, urgency, image, imageCaption, content, sources },
  // ... 3 more reports
}

actorDialogues = {
  goita: { avatar, name, title, relationship, message, context, options: [
    { icon, title, description, effects: [{ type, label }] }
  ]},
  // ... 4 more actors
}
```

### **Event Handlers**
- Intel items: `data-intel` attribute triggers `showIntelReport()`
- Actor cards: Name detection triggers `showActorDialogue()`
- Character button: Direct `showCharacterProfile()` call
- Overlay clicks: Close modals
- Escape key: Close modals (if implemented)

### **Game State Integration**
- Dialogue choices affect `gameState.resources.politicalCapital`, `.budget`
- Resource display updates via `updateResources()`
- Notifications show choice consequences
- Relationship meters reflect actor stance

---

## 🎯 Design Philosophy

### **Intelligence Reports**
- **Credibility**: Authentic sources, realistic analysis, actual geographic/political context
- **Depth**: Strategic implications not just facts, recommended actions not just problems
- **Professionalism**: Newspaper aesthetic creates serious tone matching diplomatic simulation

### **Actor Dialogues**
- **Agency**: Player makes meaningful choices with visible consequences
- **Realism**: No easy answers—all choices have trade-offs
- **Nuance**: Options range from pragmatic to principled, military to diplomatic
- **Consequences**: Visible effects on Political Capital, Budget, Legitimacy, Relationships

### **Character Profile**
- **Immersion**: Rich backstory creates emotional investment
- **Legitimacy**: Detailed credentials justify player authority
- **Motivation**: Personal history explains decision-making philosophy
- **Stakes**: Experimental mandate raises importance of success

---

## 🚀 Future Enhancement Opportunities

1. **Intelligence Reports**
   - Real satellite imagery
   - Interactive maps showing locations
   - Video/audio clips from sources
   - Multi-page reports for complex situations
   - Save/bookmark important reports

2. **Actor Dialogues**
   - Multi-turn conversations
   - Relationship tracking over time
   - Actor memory of past choices
   - Branching dialogue trees
   - Success/failure outcomes for choices

3. **Character Profile**
   - Skill progression system
   - Reputation tracking
   - Awards/achievements
   - Dynamic stats based on gameplay
   - Character customization options

4. **Integration**
   - Link intel reports to specific zones
   - Actor positions affect zone situations
   - Character background unlocks dialogue options
   - Timeline shows character's interventions
   - After-action reports review choices

---

## ✅ Completion Checklist

- ✅ 4 complete intelligence reports with newspaper styling
- ✅ 5 actor dialogues with 4 options each (20 total dialogue choices)
- ✅ Full character profile with 7 sections
- ✅ Click-to-open intel items
- ✅ Click-to-dialogue actor cards
- ✅ "Your Character" header button
- ✅ Consequence system affecting game state
- ✅ Relationship meters for actors
- ✅ Newspaper-style report design
- ✅ Timeline visualization
- ✅ Modal close functionality
- ✅ Smooth animations and transitions
- ✅ Mobile-responsive considerations

**Status**: All systems operational and integrated with existing gameplay interface.