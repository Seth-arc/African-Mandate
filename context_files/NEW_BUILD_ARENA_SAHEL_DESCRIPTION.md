Game Title: African Mandate
## Executive Summary
The Sahel region faces a **multi-dimensional crisis** combining jihadist insurgency, military coups, climate-induced resource scarcity, and great power competition. This briefing provides comprehensive regional threat assessment, strategic asset mapping, and actor profiles for operational planning.
Success depends on:
1. **Systems Thinking**: Recognizing climate-security-governance interconnections
2. **Ethical Restraint**: Avoiding short-term tactical gains that create long-term strategic costs
3. **African Ownership**: Building regional capacity rather than dependency
4. **Civilian Protection**: Prioritizing population security over kinetic metrics
**No military solution exists without addressing structural drivers.**
**Overall, Threat Environment**: **CRITICAL** (Regional average: 71.6/100)
 Introduction for Ideation
This document is designed to guide you through the creative and technical process of building a rich, replayable, and impactful Sahel Arena game. Each section contains targeted questions to help you think deeply about the game’s systems, narrative, user experience, and technical structure. As you answer these questions, let your imagination explore possibilities—consider what will make the game unique, meaningful, and engaging for players. Use your responses as the foundation for your design document, data schema, and ultimately, the game itself.
 Questions for Developing a Full Sahel Arena Game JSON
 1. Game Structure & Flow
- How many turns, phases, or acts will the game have?
•	In the game, they will be called Acts and there will be 5
- Will there be branching paths or multiple endings?
•	Branching paths with endings based on the measured metrics 
- How are game sessions saved, resumed, or reset?
•	I want to use Supabase as the backend database handling for this.  If a user wants to save and resume their game, they will have to sign up (google login available). This will allow the user to load progress from a previous game when they login again.
- What triggers a game over or early ending?
•	Average Stability: > 55
•	Average Insurgency Level: < 45
•	Global Legitimacy: > 55
•	Regional Synergy: > 0.55
•	Civilian Support: > 50
- How do tutorial or onboarding phases work?
•	First time users will be greeted with a video modal with slides with additional instructions, this modal can be minimized and remains visible (as a minimized capsule) so that a user can just click the capsule to revisit.
 2. Introduction & Context
- What is the player's origin story and motivation?
Origin Story
•	You are a rising diplomat and crisis manager, handpicked by the African Union’s Peace and Security Council after successfully mediating a major local conflict in your home country.
•	Your reputation for integrity, cultural fluency, and innovative problem-solving has caught the attention of both the AU and ECOWAS.
•	In the wake of escalating crises in the Sahel, the AU, in partnership with ECOWAS, creates a new “Special Envoy for Sahel Stabilization” role—tasked with uniting fractured coalitions, restoring constitutional order, and addressing root causes of instability.
•	You are the first to hold this position, symbolizing a new era of African-led solutions and regional solidarity.
Motivation
•	Driven by a vision of “African solutions to African problems,” you seek to prove that the continent’s own institutions can resolve even the most complex crises.
•	You are motivated by personal experience: your family or community was once displaced by conflict, giving you a deep empathy for civilians at risk.
•	The AU’s mandate is clear: protect civilians, restore peace, and build a model for future African interventions—without overreliance on external powers.
•	Your success could redefine the AU’s role in continental security and inspire a new generation of African leaders.
- How is the world introduced (cutscene, text, dialogue)?
•	Begin the game with a cinematic video montage: satellite imagery of the Sahel, news headlines, and real footage or stylized animation showing the region’s landscapes, people, and crises (insurgency, climate, migration, diplomacy).
•	Overlay a powerful narration (in English, French, and local languages) summarizing the multi-dimensional crisis, the African Union’s call to action, and the player’s unique appointment as Special Envoy.
•	Use dynamic transitions to highlight key locations, actors, and threats, ending with the AU/ECOWAS emblem and a direct address to the player: “The future of the Sahel is in your hands.”
•	This immersive video sets the tone, stakes, and context—making the player feel the urgency and importance of their mission from the very first moment.
- What is the tone (serious, hopeful, satirical, etc.)?
The ideal tone for this game should be:
•	Serious and urgent, reflecting the real-world gravity of the Sahel’s crises.
•	Empowering and hopeful, emphasizing African agency, resilience, and the possibility of positive change.
•	Respectful and nuanced, avoiding stereotypes and treating all actors and communities with dignity.
•	Immersive and dramatic, using tension, high stakes, and moral dilemmas to engage the player.
•	Analytical and strategic, encouraging thoughtful decision-making and systems thinking.
•	This balance will make the game impactful, authentic, and motivating—challenging players while inspiring them to believe in African-led solutions.
- Are there historical or fictionalized elements?
It must be based on factual historical elements and contemporary dynamics with fictionalized elements for game enhancement.
- How is the initial challenge or crisis presented?
•	The initial challenge or crisis should be presented as an urgent, multi-layered emergency that immediately tests the player’s leadership and decision-making. Here’s an effective approach:
•	Open with a cinematic video or animated sequence showing escalating violence, humanitarian suffering, and political chaos across the Sahel—intercut with urgent news flashes and AU/ECOWAS emergency meetings.
•	Deliver a direct briefing (via video, voiceover, or immersive text) from the African Union Peace and Security Council: “A coalition of crises threatens to engulf the Sahel. Jihadist offensives, military coups, and climate disasters are converging. Millions are at risk. The world is watching. You have been appointed as Special Envoy to lead a new African response.”
•	Present the player with a “Situation Room” interface: maps with hotspots, real-time reports of attacks, refugee flows, and diplomatic standoffs.
•	Set immediate objectives: stabilize a critical territory, prevent a coup, and coordinate humanitarian relief—making it clear that every decision will have high stakes and ripple effects.
•	This approach creates urgency, context, and agency—drawing the player into the crisis and their pivotal role from the very first moment.

 2. Resources
1. Financial Resources
Budget: The player’s main pool for interventions (security, humanitarian, economic, diplomatic).
External Aid: Grants or loans from AU, ECOWAS, UN, EU, US, France, etc.
Emergency Funds: Special reserves for urgent crises or injects.
2. Human Resources
Personnel:
Security forces (military, police, border guards, special units)
Humanitarian workers (NGOs, UN, local agencies)
Technical experts (engineers, mediators, climate specialists)
Advisors and envoys (diplomatic, intelligence, economic)
Delegates/Subordinates: Trusted agents to whom the player can delegate tasks.
3. Political Capital
Influence:
ECOWAS/AU standing, international reputation, leverage with local actors.
Goodwill:
Civilian support, trust with local leaders, buy-in from state actors.
4. Material Assets
Equipment:
Vehicles, medical supplies, food stocks, construction materials, surveillance tech.
Strategic Assets:
Airlift/transport, drones, communications, field hospitals, mobile command posts.
5. Information/Intelligence
Intel Points:
Used to reveal threats, anticipate attacks, or unlock negotiation options.
Situation Reports:
Updated data on territory status, actor intentions, humanitarian needs.
6. Time
Turns:
Each turn represents a set period (e.g., 3 months); time is a resource for planning and responding.
Urgency Windows:
Some actions/events are only available for a limited number of turns.
7. Special/Unique Resources
One-time-use Assets:
Elite intervention teams, special envoys, unique diplomatic cards.
Scenario-specific Items:
E.g., “UNESCO Heritage Restoration Grant,” “Climate Adaptation Package,” “Intelligence Coup.”
Resource Flows
Earned:
Successes, international support, territory stabilization, positive media, negotiation wins.
Spent:
Deploying interventions, responding to crises, maintaining operations, bribing/negotiating.
Lost:
Failures, corruption, insurgent attacks, negative events, loss of territory or support.
Resource Management
Allocation:
Player must decide how to distribute limited resources across regions, crises, and priorities.
Trade-offs:
Overcommitting to one area may leave others vulnerable.
Unlocks:
Certain actions or events may unlock new resources or replenish pools (e.g., successful mediation brings new funding).
Example Resource Table
Resource Type	Description/Use	How to Gain	How to Lose/Spend
Budget	Fund interventions, buy assets, pay for operations	Aid, success, negotiation	Deploy actions, events
Personnel	Carry out missions, staff programs	Recruitment, partnerships	Casualties, attrition
Political Capital	Unlock options, negotiate, influence actors	Success, goodwill	Failures, scandals
Equipment	Enable/boost interventions	Purchase, aid, salvage	Use, loss, destruction
Intel Points	Reveal threats, anticipate events	Surveillance, informants	Use, failed ops
Time/Turns	Plan, respond, execute	N/A	Each turn, urgent events
Special Assets	Unique, powerful one-time actions	Scenario, achievements	Use (single-use)

3. Actors & Role Players
- What are the names, backgrounds, and personalities of all major and minor actors?
State Actors
•	Mali Transitional Government (STATE_MALI)
Background: Military junta ruling after a 2021 coup; low legitimacy and capacity; controls Northern and Central Mali.
Personality: Defensive, suspicious of external intervention, reliant on Russian support (Wagner), resistant to ECOWAS pressure, prioritizes regime survival over reforms.
Type: Military Junta (Coup: May 24, 2021)
Leadership: Military officers, led by a transitional president (Colonel Assimi Goïta).
Structure: Centralized command, weak civilian oversight, suspended constitution.
Motivations: Regime survival, resisting external pressure, maintaining territorial integrity.
Internal Dynamics: Factionalism within the military, reliance on Wagner for security, low legitimacy among civilians (especially Tuareg and Fulani).
Operational Nuances: Minimal state presence in the north/center, predatory behavior by security forces, heavy-handed counterinsurgency, dependency on Russian support.
Personality: Defensive, suspicious, reactive, prioritizes regime over reforms.

•	Burkina Faso Transitional Authority (STATE_BURKINA)
Background: Military junta post-2022 coup; weak institutions; controls Eastern Burkina Faso; faces severe resource and legitimacy constraints.
Personality: Desperate for security, pragmatic but reactive, open to external help but wary of conditions, struggles with militia abuses.
Type: Military Junta (Coup: January 24, 2022)
Leadership: Military officers, led by Captain Ibrahim Traoré.
Structure: Weak civilian institutions, military-dominated, resource-constrained.
Motivations: Regime survival, restoring security, seeking external support.
Internal Dynamics: Strained by VDP militia abuses, ethnic tensions, and limited capacity.
Operational Nuances: Relies on community militias (VDP), faces international sanctions, open to Russian involvement, struggles to control rural areas.
Personality: Desperate, pragmatic, open to negotiation but wary of conditions.

•	Niger Republic (STATE_NIGER)
Background: Stable democracy; moderate legitimacy and capacity; strong regional cooperation; controls Western Niger.
Personality: Cooperative, proactive, values partnerships (especially with US/France/ECOWAS), seeks stability and humanitarian solutions.
Type: Democratic Government (Stable)
Leadership: Elected president and parliament.
Structure: Functional civilian institutions, regional cooperation.
Motivations: Stability, regional leadership, humanitarian response.
Internal Dynamics: Moderate legitimacy, strong will but limited resources, faces pressure from refugee influx and border insecurity.
Operational Nuances: Proactive in intelligence sharing, strong partnerships with US/France/ECOWAS, preventive approach to insurgency.
Personality: Cooperative, proactive, values partnerships.

•	Chad (STATE_CHAD)
Background: Authoritarian but stable; strongest military in the region; controls Lake Chad Basin.
Personality: Assertive, militaristic, values regional leadership, pragmatic about human rights, seeks recognition and operational effectiveness.
Type: Authoritarian Stable Regime
Leadership: Military-dominated, led by Mahamat Déby.
Structure: Strongest military in the region, limited democracy.
Motivations: Regional leadership, security dominance, regime stability.
Internal Dynamics: Authoritarian governance, legitimacy concerns, operational effectiveness.
Operational Nuances: Dominates Lake Chad security, leads regional peacekeeping, seeks recognition.
Personality: Assertive, militaristic, pragmatic.

Non-State Armed Groups
•	JNIM - Jama'at Nusrat al-Islam wal-Muslimin (NS_JNIM)
Background: Al-Qaeda affiliate; dominant in Northern/Central Mali, present in Burkina Faso; decentralized leadership.
Personality: Adaptive, strategic, provides shadow governance, exploits grievances, pragmatic in negotiations, but ideologically rigid at the core.
Type: Al-Qaeda Affiliate Jihadist Insurgency
Leadership: Decentralized, Iyad Ag Ghaly as overall leader.
Structure: Network of cells, local commanders, ethnic alliances (especially Fulani).
Motivations: Establish parallel governance, exploit grievances, expand influence.
Internal Dynamics: Competes with ISGS, negotiates with local leaders, pragmatic in recruitment.
Operational Nuances: Provides shadow governance (courts, services), funds via smuggling/taxation, exploits state abuses.
Personality: Adaptive, strategic, pragmatic, but ideologically rigid at core.

•	ISGS - Islamic State Greater Sahara (NS_ISGS)
Background: Islamic State franchise; expanding in Mali, Burkina Faso, Niger; centralized command.
Personality: Ruthless, highly adaptive, brutal tactics, focused on territorial expansion and resource control, less interested in governance, more in coercion.
Type: Islamic State Franchise
Leadership: Centralized, Emir and top commanders.
Structure: Hierarchical, foreign fighter networks, brutal enforcement.
Motivations: Territorial expansion, resource control, ideological dominance.
Internal Dynamics: High adaptation, internal power struggles, alienates communities through violence.
Operational Nuances: Mass casualty attacks, gold mining extortion, border control, ethnic targeting.
Personality: Ruthless, highly adaptive, coercive, less interested in governance.

Regional Organizations
•	ECOWAS (ORG_ECOWAS)
Background: Regional bloc; moderate legitimacy and capacity; mandates security, democracy, and integration.
Personality: Bureaucratic but committed, seeks African-led solutions, struggles with internal divisions, values legitimacy and regional ownership.
Type: Regional Bloc
Structure: Intergovernmental, rotating leadership, Standby Force.
Motivations: Regional security, democracy, economic integration.
Internal Dynamics: Member suspensions (Mali, Burkina Faso), limited enforcement, perceived as Western proxy.
Operational Nuances: Sanctions, mediation, regional coordination, AU partnership.
Personality: Bureaucratic, committed, legitimacy-focused.

•	AES (ORG_ASE)
Background: - The Alliance of Sahel States (AES) was established in 2023 as a formal security pact between Mali, Burkina Faso, and Niger, all governed by military juntas following successive coups.
- The alliance emerged as a direct response to ECOWAS sanctions, diplomatic isolation, and what its members perceived as Western interference in their domestic affairs.
- AES members share a common interest in regime survival, mutual defense, and resisting external pressure for rapid democratic transition.
- The alliance is motivated by a desire to assert national sovereignty, reduce dependency on Western security partners, and promote military-led regional cooperation.
- Internally, the AES faces challenges of limited resources, divergent national interests, and mutual mistrust, but is united by a sense of shared threat and the need for collective bargaining power.
- The AES coordinates joint security operations, intelligence sharing, and diplomatic messaging, and has sought to deepen ties with non-Western partners, particularly Russia.
Type: Regional Security Alliance
Structure: Alliance of Mali, Burkina Faso, Niger (post-coup governments), military-led coordination.
Motivations: Mutual defense, regime survival, resist ECOWAS/Western pressure.
Internal Dynamics: Limited resources, internal mistrust, divergent interests, legitimacy deficit.
Operational Nuances: Joint security ops, intelligence sharing, anti-interventionist messaging, open to Russian/non-Western partnerships.
Personality: Defensive, anti-interventionist, sovereignty-focused, suspicious of outsiders.

External Actors
•	Wagner Group (EXT_WAGNER)
Background: Russian private military contractor; operates in Central Mali; seeks geopolitical influence and resource extraction.
Personality: Secretive, aggressive, transactional, prioritizes Russian interests, disregards civilian impact.
Type: Russian Private Military Contractor
Structure: Paramilitary, operates under Russian state direction.
Motivations: Geopolitical influence, resource extraction, displace Western actors.
Internal Dynamics: Operates with impunity, heavy-handed, transactional.
Operational Nuances: Military training, protection contracts, high civilian casualties, arms transfers.
Personality: Secretive, aggressive, transactional.

•	France (EXT_FRANCE)
Background: Former colonial power; declining influence; withdrawing military presence but retains intelligence and economic interests.
Personality: Technocratic, legacy-minded, cautious, faces legitimacy deficit, offers technical support if relationship managed.
Type: Former Colonial Power
Structure: State, intelligence, and military apparatus.
Motivations: Maintain influence, protect economic interests, support stability.
Internal Dynamics: Declining influence, anti-French sentiment, legacy ties.
Operational Nuances: Intelligence sharing, technical support, donor funding, military withdrawal.
Personality: Technocratic, legacy-minded, cautious.
Minor/Community Actors (Implied)
•	Dogon Self-Defense Militias: Ethnic Dogon groups in Central Mali, defensive but implicated in ethnic violence.
•	Fulani Community Leaders: Marginalized, open to negotiation if security is guaranteed, often caught between state and insurgents.
•	Volunteers for Defense of Homeland (VDP): Government-armed militias in Burkina Faso, aggressive, sometimes abusive, motivated by local security.
•	Local Elders and DDR Participants: Pragmatic, seek stability and economic alternatives, potential bridge-builders for peace.
These actors drive the scenario’s narrative, each with distinct motivations, alliances, and vulnerabilities, shaping the game’s strategic and ethical dilemmas. Each actor will have a logo/flag/photo.



Geographic Focus, Territories and Zones of Interest
### Threat Level Classification
| Level | Score Range | Criteria | Response Priority |
|-------|-------------|----------|------------------|
| **CRITICAL** | 70+ | Imminent state collapse, active insurgent control, humanitarian catastrophe | Immediate intervention required |
| **HIGH** | 60-69 | Significant insurgent presence, deteriorating stability, high civilian casualties | Urgent action needed |
| **MODERATE** | 40-59 | Contested territories, moderate insurgency, functional state presence | Sustained engagement |
| **LOW** | <40 | Stable governance, minimal insurgent activity, civilian security maintained | Preventive measures |

### Regional Overview
| Territory              | Threat Level | Score | Key Threats & Actors                                                                 | Humanitarian Situation & Notes                | Population at Risk |
|-----------------------|-------------|-------|--------------------------------------------------------------------------------------|-----------------------------------------------|-------------------|
| **Northern Mali**     | 🔴 CRITICAL | 82    | JNIM/ISGS control, state collapse, smuggling, ethnic violence.                       | 3 major IDP camps, 67% food insecurity, 40% territory inaccessible. | 1,200,000         |
|                       |             |       | State military minimal, Wagner presence, Tuareg/Arab/Songhai tensions.               | Humanitarian convoys require insurgent approval. |                   |
| **Eastern Burkina Faso** | 🔴 CRITICAL | 76 | ISGS expansion, ethnic violence (VDP militias), gold mining exploitation.            | 6 IDP camps, 85% rural food insecurity, ethnic targeting of Fulani. | 2,100,000         |
|                       |             |       | Government control limited to cities, ISGS controls rural/gold sites.                | Gold mining accelerates deforestation, water depletion. |             |
| **Central Mali**      | 🔴 CRITICAL | 74    | JNIM governance, Dogon-Fulani ethnic conflict, Wagner presence, rural insurgency.    | 5 IDP camps, 4.2M at famine risk, ethnic targeting, failed harvests. | 3,500,000         |
|                       |             |       | State controls urban centers, JNIM rural, ethnic militias active.                    | Humanitarian access requires JNIM approval.    |                   |
| **Western Niger**     | 🟠 HIGH     | 68    | ISGS incursions, border insecurity, IDP influx, JNIM economic infiltration.          | 3 IDP camps, 45% food insecurity, Malian refugee influx. | 2,800,000         |
|                       |             |       | Government stretched thin, cross-border attacks, livestock economy at risk.          | Host communities strained, early resource conflict. |                |
| **Lake Chad Basin**   | 🟡 MODERATE | 58    | Boko Haram remnants, ISGS spillover, resource competition, climate stress.           | 2 IDP camps, 40% food insecurity, shrinking lake, displaced fishers. | 1,800,000         |
|                       |             |       | Chad military control, porous borders, inter-state/communal tensions.                | Insurgent checkpoints tax trade, regional cooperation needed. |         |

**Total Population Affected:** 11,400,000 civilians

---
## Territory Profiles
### 1. Northern Mali (Gao, Kidal, Timbuktu)
#### Threat Assessment: 🔴 **CRITICAL** (82/100)
**Administrative Status**: Nominal Malian government control; de facto JNIM/ISGS territorial governance
**Population**: 1,200,000  
**Ethnic Composition**: Tuareg (40%), Arab (30%), Songhai (25%), Other (5%)  
**Urbanization**: Low (~15% urban)  
**Terrain**: Desert Sahara - vast, arid, difficult to patrol

#### Key Metrics
- **Insurgency Level**: 82/100 🔴 CRITICAL
- **Stability**: 28/100 🔴 CRITICAL
- **Civilian Support (for intervention)**: 32/100 🔴 LOW
- **Reconstruction Index**: 12/100 🔴 MINIMAL
- **Economic Resilience**: 18/100 🔴 FRAGILE

#### Threat Landscape
**Primary Insurgent Groups**:
- **JNIM (Al-Qaeda)**: Dominant in Gao and Timbuktu regions; provides parallel governance including Sharia courts, taxation, and social services
- **ISGS (Islamic State)**: Controls key smuggling corridors; targets ethnic minorities; competes with JNIM for territorial control

**Strategic Assets**:
- 🛣️ **Trans-Saharan Trade Routes**: Ancient commercial corridors now used for smuggling (arms, drugs, contraband)
- 🚛 **Smuggling Corridors**: 8 primary routes linking Maghreb to West Africa (JNIM revenue: $2-3M/month)
- 💎 **Mineral Deposits**: Limited gold deposits in eastern Kidal region
- 📍 **Strategic Cities**: 
  - Gao (regional capital, ~100,000 pop.) - contested
  - Timbuktu (UNESCO site, ~50,000 pop.) - JNIM influence
  - Kidal (Tuareg heartland, ~25,000 pop.) - autonomous

**Border Status**: **POROUS** - Mali-Algeria, Mali-Mauritania, Mali-Niger borders effectively uncontrolled

**Climate Stress**: **EXTREME DROUGHT**
- Rainfall deficit: 40% below historical average
- Livestock mortality: 30-40% in past 18 months
- Agricultural collapse: 80% of farmland non-productive
- Desertification advancing 5km/year

#### Key Security Incidents (Recent)
1. **Moura Massacre (March 2022)**: Malian military and Wagner forces killed 300+ civilians in counter-insurgency operation
2. **Timbuktu IED Campaign (2023-Present)**: ISGS targeting Malian patrols, 150+ military casualties
3. **Gao Market Attack (2024)**: JNIM-ISGS clash kills 40 civilians in territorial dispute

#### Humanitarian Situation
- **IDP Camps**: 3 major camps (total: 85,000 displaced)
  - Gao City Camp: 35,000
  - Timbuktu Periphery: 28,000
  - Kidal Transit Camp: 22,000
- **Food Insecurity**: 67% of population (800,000 people) in crisis or emergency food status
- **Access Constraints**: Humanitarian convoys require JNIM/ISGS permission; 40% of territory inaccessible

#### Operational Challenges
- ❌ State military presence minimal and predatory
- ❌ Wagner Group heavy-handed tactics alienate civilians
- ❌ Insurgent parallel governance more effective than state services
- ❌ Ethnic Tuareg populations view Bamako as occupying force
- ❌ French withdrawal created capability vacuum (air support, intelligence)

#### Opportunities
- ✅ Tuareg autonomy negotiations could fracture JNIM coalition
- ✅ JNIM-ISGS rivalry exploitable through mediation
- ✅ Local elders receptive to DDR if economic alternatives provided
- ✅ UNESCO heritage site restoration could rebuild civilian support

---

### 2. Central Mali (Mopti, Segou)

#### Threat Assessment: 🔴 **CRITICAL** (74/100)
**Administrative Status**: Contested - Malian government controls urban centers; JNIM controls rural areas
**Population**: 3,500,000 (largest affected population)  
**Ethnic Composition**: Dogon (35%), Fulani (30%), Bambara (25%), Other (10%)  
**Urbanization**: Medium (~40% urban in Mopti and Segou cities)  
**Terrain**: Sahel Transition Zone - mixed savanna, seasonal agriculture

#### Key Metrics
- **Insurgency Level**: 74/100 🔴 CRITICAL
- **Stability**: 35/100 🔴 CRITICAL
- **Civilian Support**: 38/100 🔴 LOW
- **Reconstruction Index**: 18/100 🔴 MINIMAL
- **Economic Resilience**: 25/100 🔴 FRAGILE

#### Threat Landscape
**Primary Insurgent Groups**:
- **JNIM**: Deeply embedded; exploits Dogon-Fulani ethnic conflict; provides governance, justice, and economic arbitration

**Ethnic Conflict Drivers**:
- **Dogon Self-Defense Militias**: Armed groups conducting ethnic cleansing against Fulani communities (accused of supporting JNIM)
- **Fulani Marginalization**: State and militia violence drives recruitment into JNIM; 60% of JNIM recruits are Fulani youth

**Strategic Assets**:
- 🌾 **Agricultural Belt**: Niger River floodplains - critical for regional food security
- 🐄 **Livestock Corridors**: Transhumance routes for 2M+ cattle; source of Dogon-Fulani conflict
- 🏙️ **Urban Centers**: 
  - Mopti (250,000 pop.) - regional capital, government-controlled but JNIM infiltration
  - Segou (130,000 pop.) - economic hub, relatively stable
- 💧 **Water Resources**: Niger River access; irrigation infrastructure targets for insurgent attacks

**Border Status**: Internal region; porous connections to Northern Mali and Burkina Faso

**Climate Stress**: **SEVERE DROUGHT**
- Pastoralist-farmer conflicts intensify as grazing land shrinks
- Seasonal migration routes blocked by insecurity, forcing herders into farmland
- Failed harvests: 2 out of last 3 years

#### Key Security Incidents (Recent)
1. **Ogossagou Massacre (2019, repeated 2023)**: Dogon militias kill 160+ Fulani civilians; Malian military complicity alleged
2. **Mopti Market Bombing (2024)**: JNIM targets government facility, 35 civilian casualties
3. **Humanitarian Convoy Ambush (2024)**: NGO convoy attacked, 8 aid workers killed

#### Humanitarian Situation
- **IDP Camps**: 5 major camps (total: 140,000 displaced)
  - Mopti Urban Periphery: 55,000 (predominantly Fulani fleeing militias)
  - Segou Camps: 40,000
  - Rural Displacement Sites: 45,000
- **Food Insecurity**: 4.2 million at risk of famine across region
- **Ethnic Targeting**: Fulani civilians face violence from both state forces and Dogon militias; Dogon villages targeted by JNIM reprisals

#### Operational Challenges
- ❌ Ethnic conflict deeply entrenched; JNIM exploits grievances effectively
- ❌ Malian military and Wagner forces implicated in ethnic massacres
- ❌ State legitimacy near zero among Fulani populations
- ❌ Humanitarian access requires JNIM approval; NGOs navigating complex negotiations

#### Opportunities
- ✅ Inter-communal dialogue initiatives show promise in localized areas
- ✅ JNIM leadership signals willingness to negotiate with credible mediators
- ✅ DDR programs successfully reintegrated 800 ex-combatants (potential for scale-up)
- ✅ Economic reconstruction could address root causes of grievance-based recruitment

---

### 3. Eastern Burkina Faso
#### Threat Assessment: 🔴 **CRITICAL** (76/100)
**Administrative Status**: Government control limited to provincial capitals; ISGS controls rural areas
**Population**: 2,100,000  
**Ethnic Composition**: Mossi (40%), Fulani (35%), Gourmantche (20%), Other (5%)  
**Urbanization**: Low (~20% urban)  
**Terrain**: Sahel - semi-arid grassland, vulnerable to desertification

#### Key Metrics
- **Insurgency Level**: 76/100 🔴 CRITICAL
- **Stability**: 32/100 🔴 CRITICAL
- **Civilian Support**: 34/100 🔴 LOW
- **Reconstruction Index**: 16/100 🔴 MINIMAL
- **Economic Resilience**: 23/100 🔴 FRAGILE

#### Threat Landscape
**Primary Insurgent Groups**:
- **ISGS**: Rapid territorial expansion; ethnic targeting of non-Muslim minorities; control of gold mining sites; mass casualty attacks

**Community Defense Militias**:
- **Volunteers for Defense of Homeland (VDP)**: Government-armed militias; documented ethnic violence against Fulani; extrajudicial killings; 12,000+ active militia members

**Strategic Assets**:
- 💎 **Gold Mining**: Artisanal and industrial gold deposits; ISGS extorts $500K-$1M monthly from miners
- 🏞️ **Strategic Corridor**: Border region linking Burkina-Mali-Niger; ISGS uses for cross-border operations
- 🌾 **Agricultural Land**: Degraded but recoverable with climate adaptation investment
- 📍 **Provincial Capitals**: 
  - Fada N'gourma (110,000 pop.) - government hold, ISGS pressure
  - Pama (50,000 pop.) - contested, IDP influx

**Border Status**: **HIGHLY POROUS** - Burkina-Mali, Burkina-Niger, Burkina-Togo borders uncontrolled; ISGS moves freely

**Climate Stress**: **SEVERE DROUGHT**
- Gold mining accelerates deforestation and water depletion
- Pastoralist communities displaced, increasing vulnerability to ISGS recruitment
- Food prices increased 300% in past 2 years

#### Key Security Incidents (Recent)
1. **Solhan Massacre (2021)**: ISGS kills 160+ civilians in deadliest attack in Burkinabe history
2. **VDP Ethnic Violence (2023-Present)**: Militia attacks on Fulani villages; 200+ documented extrajudicial killings
3. **Gold Mine Raids (2024)**: ISGS seizes control of 6 major artisanal mining sites

#### Humanitarian Situation
- **IDP Camps**: 6 major camps (total: 180,000 displaced)
  - Fada N'gourma Camps: 70,000
  - Pama Overflow: 45,000
  - Rural Dispersal: 65,000
- **Food Insecurity**: 85% of rural population in crisis or emergency status
- **Ethnic Violence**: Fulani populations targeted by VDP militias; ISGS uses this for recruitment propaganda

#### Operational Challenges
- ❌ VDP militias fuel ethnic conflict while reducing insurgency short-term
- ❌ Burkina government weakened by coups; limited capacity for oversight
- ❌ ISGS adaptation rate high (75/100); quickly counters interventions
- ❌ Gold mining economy funds insurgency; artisanal miners coerced into supporting ISGS

#### Opportunities
- ✅ Gold mining regulation could cut ISGS funding by 40%
- ✅ VDP human rights training could reduce ethnic violence (if enforced)
- ✅ Fulani community leaders willing to negotiate if security guaranteed
- ✅ Climate adaptation programs address root causes of displacement

---

### 4. Western Niger (Tillaberi, Tahoua)
#### Threat Assessment: 🟠 **HIGH** (68/100)
**Administrative Status**: Government maintains control but ISGS incursions increasing
**Population**: 2,800,000  
**Ethnic Composition**: Zarma (45%), Tuareg (25%), Fulani (20%), Other (10%)  
**Urbanization**: Low (~18% urban)  
**Terrain**: Sahel - transitional zone between Sahara and savanna

#### Key Metrics
- **Insurgency Level**: 68/100 🟠 HIGH
- **Stability**: 36/100 🔴 CRITICAL
- **Civilian Support**: 40/100 🔴 LOW-MODERATE
- **Reconstruction Index**: 20/100 🔴 MINIMAL
- **Economic Resilience**: 28/100 🔴 FRAGILE

#### Threat Landscape
**Primary Insurgent Groups**:
- **ISGS**: Cross-border operations from Mali; ambushes of Niger military; IED campaigns
- **JNIM**: Limited presence but expanding influence through economic outreach

**Strategic Assets**:
- 🐄 **Livestock Economy**: 1.5M+ cattle; critical to regional food security and livelihoods
- ⚛️ **Uranium Proximity**: Close to Arlit uranium mining region (not directly threatened but strategic concern)
- 🚛 **Transit Corridors**: Commercial routes linking Niger to Mali and Burkina Faso
- 🏙️ **Regional Cities**:
  - Tillaberi (25,000 pop.) - provincial capital, government control
  - Tahoua (120,000 pop.) - economic center, relatively secure

**Border Status**: **POROUS** - Niger-Mali border difficult to patrol; ISGS infiltration routes established

**Climate Stress**: **MODERATE DROUGHT**
- Less severe than Mali/Burkina but worsening
- Pastoralist stress increasing; early warning signs of resource conflict

#### Key Security Incidents (Recent)
1. **Military Convoy Ambushes (2023-2024)**: ISGS killed 150+ Niger soldiers in IED and ambush attacks
2. **Village Raids (2024)**: ISGS conducting intimidation raids; 2,000+ villagers displaced
3. **IDP Influx (Ongoing)**: 40,000+ refugees from Mali seeking safety in western Niger

#### Humanitarian Situation
- **IDP Camps**: 3 major camps (total: 55,000)
  - Tillaberi Region: 35,000 (mostly Malian refugees)
  - Tahoua Area: 20,000
- **Food Insecurity**: 45% of population at risk
- **Cross-Border Dynamics**: Hosting Malian IDPs strains local resources; potential for inter-communal tension

#### Operational Challenges
- ❌ Niger military stretched thin; limited resources for border security
- ❌ ISGS uses Mali as safe haven; cross-border coordination required
- ❌ IDP influx creates humanitarian strain on host communities
- ❌ Early signs of JNIM economic infiltration (trade, informal taxation)

#### Opportunities
- ✅ Niger government maintains legitimacy; population supports intervention
- ✅ Strong cooperation with US/France intelligence; capabilities above regional average
- ✅ Preventive approach possible before insurgency reaches critical levels
- ✅ Pastoralist conflict mediation could prevent ISGS recruitment

---

### 5. Lake Chad Basin
#### Threat Assessment: 🟡 **MODERATE** (58/100)
**Administrative Status**: Chad military maintains control; cross-border insurgency contained but persistent
**Population**: 1,800,000  
**Ethnic Composition**: Kanuri (40%), Arab (30%), Buduma (20%), Other (10%)  
**Urbanization**: Medium (~35% urban in lake basin towns)  
**Terrain**: Lake Basin - wetlands, islands, complex hydrology

#### Key Metrics
- **Insurgency Level**: 58/100 🟡 MODERATE
- **Stability**: 42/100 🟡 MODERATE
- **Civilian Support**: 45/100 🟡 MODERATE
- **Reconstruction Index**: 25/100 🔴 LOW
- **Economic Resilience**: 32/100 🔴 FRAGILE

#### Threat Landscape
**Primary Insurgent Groups**:
- **Boko Haram Remnants**: Fragmented presence; operates from lake islands; kidnapping and extortion
- **ISGS Elements**: Limited spillover from Niger-Nigeria border regions

**Strategic Assets**:
- 🌊 **Lake Chad Water Resources**: Critical for 4 countries (Chad, Niger, Nigeria, Cameroon); shrinking due to climate change
- 🐟 **Fishing Industry**: Supports 1.5M livelihoods; insurgent taxation disrupts economy
- 🌾 **Agricultural Land**: Fertile floodplains; contested between farmers, herders, and insurgents
- 🏙️ **Basin Towns**:
  - N'Djamena (Chad capital, 1.4M pop.) - 200km south, stable
  - Basin towns (collective 300,000 pop.) - moderate security

**Border Status**: **POROUS** - Four-country convergence zone; Chad-Niger-Nigeria borders weakly patrolled

**Climate Stress**: **LAKE SHRINKAGE**
- Lake Chad reduced 90% in surface area since 1960s
- Fishing zones collapsed; 200,000+ fishers displaced
- Resource competition intensifying between countries and communities

#### Key Security Incidents (Recent)
1. **Island Operations (2023-2024)**: Chad military clears Boko Haram from lake islands; 500+ insurgents killed/captured
2. **Kidnapping Spree (2024)**: 150+ civilians kidnapped for ransom by fragmented insurgent groups
3. **Cross-Border Trade Disruption (Ongoing)**: Insurgent checkpoints tax fishing and trade; economic impact $20M/year

#### Humanitarian Situation
- **IDP Camps**: 2 moderate camps (total: 35,000)
  - Lake Basin Camps: 35,000 (mostly displaced fishers)
- **Food Insecurity**: 40% of population affected
- **Resource Conflict**: Inter-state and inter-communal tensions over shrinking water resources

#### Operational Challenges
- ❌ Lake geography provides insurgent safe havens (islands, wetlands)
- ❌ Four-country coordination required; competing national interests
- ❌ Climate-driven lake shrinkage exacerbates resource conflict
- ❌ Chad military authoritarian but strongest regional force; legitimacy concerns

#### Opportunities
- ✅ Chad military most capable in region; can contain insurgency
- ✅ Regional coordination framework exists (Lake Chad Basin Commission)
- ✅ Lower insurgency level allows preventive stabilization
- ✅ Climate adaptation investment could address root causes (water management, livelihood diversification)

## Strategic Assets Index
### Resource Type Classification
| Asset Type | Strategic Value | Insurgent Exploitation | Intervention Leverage |
|------------|-----------------|------------------------|----------------------|
| 💎 **Mineral Deposits** | Revenue generation; fuels insurgency if uncontrolled | HIGH - Direct funding | Regulation cuts insurgent revenue 40-60% |
| 🌊 **Lake Resources** | Livelihood security; cross-border cooperation driver | MODERATE - Taxation/extortion | Investment builds inter-state cooperation |
| 🛣️ **Strategic Corridors** | Trade, smuggling, insurgent mobility | HIGH - Logistics/revenue | Control chokes insurgent supply lines |
| 🐄 **Livestock Economy** | Food security; cultural identity; mobility | MODERATE - Taxation | Conflict mediation prevents recruitment |
| 🌾 **Agriculture** | Food security; employment | LOW-MODERATE - Indirect | Reconstruction builds civilian support |
| 🏙️ **Urban Centers** | Governance hubs; economic activity | LOW - Contested influence | State presence demonstration |

### Priority Assets for Operational Focus
#### Critical Priority (Immediate Action Required)
**1. Trans-Saharan Smuggling Corridors (Northern Mali)**
- **Current Control**: JNIM (60%), ISGS (30%), Uncontrolled (10%)
- **Insurgent Revenue**: $2-3M/month (arms, drugs, contraband, human trafficking)
- **Intervention Options**:
  - Intelligence Fusion → Financial interdiction capability
  - Counter-Crime deployment → Border surveillance
  - Regional Cooperation → Multi-state interdiction operations
- **Impact if Secured**: 40% reduction in JNIM operational capacity

**2. Gold Mining Sites (Eastern Burkina Faso)**
- **Current Control**: ISGS (6 major sites), Artisanal Miners (coerced)
- **Insurgent Revenue**: $500K-$1M/month
- **Intervention Options**:
  - Capacity Building → Mining sector regulation
  - Economic Reform → Formal mining alternatives
  - COIN Operations → Site liberation
- **Impact if Secured**: 50% reduction in ISGS funding; 20,000+ miners exit coercion

**3. Niger River Agricultural Belt (Central Mali)**
- **Current Control**: Contested (JNIM rural, Government urban)
- **Strategic Value**: Regional food security; 2M+ livelihoods
- **Intervention Options**:
  - Reconstruction → Irrigation infrastructure
  - Mediation → Pastoralist-farmer conflict resolution
  - Humanitarian Aid → Food security programs
- **Impact if Secured**: Reduces grievance-based recruitment; stabilizes 3.5M population

#### High Priority (Urgent Attention)

**4. Livestock Corridors (Central Mali, Western Niger)**
- **Current Status**: Blocked by insecurity; ethnic conflict escalating
- **Strategic Value**: 3M+ cattle; cultural/economic significance
- **Intervention Options**:
  - Mediation → Transhumance route agreements
  - Climate Adaptation → Grazing land rehabilitation
  - DDR → Militia demobilization
- **Impact if Secured**: Defuses ethnic conflict; cuts JNIM/ISGS recruitment pipeline

**5. Lake Chad Water Resources**
- **Current Status**: Cross-border resource competition; insurgent taxation
- **Strategic Value**: 1.5M livelihoods; inter-state cooperation opportunity
- **Intervention Options**:
  - Regional Cooperation → Lake Chad Basin Commission strengthening
  - Climate Adaptation → Water management infrastructure
  - Economic Reform → Livelihood diversification
- **Impact if Secured**: Reduces inter-state tension; stabilizes basin population

#### Moderate Priority (Sustained Engagement)

**6. Urban Centers (Mopti, Segou, Fada N'gourma, Tahoua)**
- **Current Status**: Government control maintained; JNIM/ISGS infiltration pressure
- **Strategic Value**: Economic hubs; governance demonstration
- **Intervention Options**:
  - Capacity Building → Municipal governance
  - Reconstruction → Urban services restoration
  - COIN Soft → Hearts and minds campaigns
- **Impact if Secured**: Demonstrates state legitimacy; economic recovery hubs

**7. IDP Camps (All Territories)**
- **Current Status**: 500,000+ displaced; humanitarian crisis; recruitment vulnerability
- **Strategic Value**: Humanitarian necessity; population control
- **Intervention Options**:
  - Humanitarian Aid → Camp services and protection
  - DDR → Ex-combatant reintegration
  - Economic Reform → Livelihood opportunities
- **Impact if Secured**: Prevents recruitment; builds civilian support for intervention

 4. Turn-by-Turn Content
- What is the structure of a single turn (phases, steps, UI flow)?
Single Turn Structure (Sahel Arena)
Turn Briefing
Situation update: Key events, intelligence, and changes since last turn.
Highlight: New threats, opportunities, and urgent issues (e.g., insurgent advances, humanitarian crises, diplomatic shifts).
Intelligence & Options
Present new intelligence (e.g., smuggling routes, leadership movements, ethnic tensions).
List available actions, each with resource costs, risks, and potential outcomes (e.g., deploy peacekeepers, launch mediation, regulate mining, counter disinformation).
Decision Phase
Player selects actions (can be limited by resources, political capital, or turn-specific constraints).
May include prioritization (e.g., choose 2 out of 4 possible interventions).
Event Resolution
System processes player choices, simulates outcomes (success, partial success, failure).
Trigger dynamic events (e.g., insurgent retaliation, civilian support shifts, international reactions).
Feedback & Metrics
Show updated key indicators: stability, insurgency, legitimacy, civilian support, resource levels.
Narrative feedback: Short debrief on consequences, new dilemmas, and emerging storylines.
Random/Scripted Events
Optional: Introduce surprise events (e.g., coup attempt, climate disaster, intelligence coup opportunity).
End-of-Turn Summary
Recap major changes, new intelligence, and set up the next turn’s context.

**UI Flow Integration (Game Scenario):**
**Introduction Screen:**
  - Briefs the player on the formation of the AES, highlighting the context of military coups, ECOWAS sanctions, and the alliance’s anti-interventionist stance.
  - Visuals: Map highlighting Mali, Burkina Faso, and Niger; AES flag/emblem; timeline of coups and sanctions.
**Alliance Dashboard:**
  - Displays AES member states, current leadership, and alliance objectives (regime survival, mutual defense, sovereignty).
  - Interactive elements: Clickable profiles for each member state showing their motivations, resources, and internal challenges.
**Crisis Event Pop-ups:**
  - When ECOWAS or Western actors take action, dynamic pop-ups show AES responses (joint statements, troop movements, diplomatic outreach).
  - Player choices: Engage in negotiation, escalate rhetoric, or seek new partners (e.g., Russia).
**Resource & Trust Meters:**
  - UI elements track alliance resources, internal trust, and external legitimacy.
  - Player actions (e.g., joint operations, intelligence sharing) affect these meters, influencing scenario outcomes.
**Decision Nodes:**
  - At key turns, the player is prompted to mediate AES internal disputes or coordinate joint operations.
  - UI presents options with projected impacts on alliance cohesion and external perception.
**Outcome Feedback:**
  - End-of-turn summaries show AES status: resource levels, trust, legitimacy, and recent actions.
  - Visual feedback: Alliance stability bar, news headlines, and international reactions.

This UI flow ensures the AES is not just a static background actor, but a dynamic, interactive force in the scenario, with player decisions and alliance dynamics directly shaping the game’s narrative and outcomes.

- How are new events, injects, or opportunities introduced each turn?
Turn Start Trigger
At the beginning of each turn, the scenario engine evaluates the current game state (resource/trust meters, previous decisions, alliance status, and external factors).
Event Pool Selection
A curated pool of possible events, injects, and opportunities is maintained for each turn. The engine selects from this pool based on:
Scenario progression (e.g., early, mid, late game)
Player actions and outcomes from previous turns
Randomized or weighted probabilities to ensure replayability
Contextual Filtering
Events are filtered for relevance:
Only those matching the current alliance status, regional situation, or player choices are eligible.
Some events are “locked” or “unlocked” by specific player actions (e.g., deepened AES-Russia ties unlock new diplomatic injects).
UI Presentation
Selected events/injects are presented to the player via:
Pop-up notifications (crisis, opportunity, intelligence coup)
Dashboard updates (new objectives, alliance requests, external threats)
Decision nodes (branching choices with projected impacts)
Player Response & Consequence
The player responds to each inject or opportunity, with choices affecting:
Resource/trust/legitimacy meters
Alliance cohesion and external perception
Unlocking or closing off future events
Outcome Feedback
At the end of the turn, the UI summarizes:
Which events occurred
Player responses and immediate consequences
New opportunities or threats for the next turn

- Are there random events or only scripted ones?
•	Scripted events ensure key narrative beats, major crises, and essential scenario developments always occur, preserving story structure and learning objectives.
•	Randomized events and injects (drawn from a curated pool) add unpredictability, replay value, and adapt to player choices, making each playthrough unique.
•	Some events can be “conditional scripted”—they trigger only if certain player actions, alliance states, or thresholds are met.
•	This balance keeps the scenario engaging, responsive, and educational, while maintaining narrative coherence and surprise.
- How does the difficulty scale over time?
Difficulty will scale over time through a combination of escalating threats, resource constraints, and more complex decision-making requirements:
Threat Escalation:
Early turns feature manageable crises and clear choices.
As turns progress, insurgent activity, humanitarian crises, and alliance tensions intensify.
New, more challenging events and injects are introduced (e.g., multi-front crises, intelligence coups, disinformation campaigns).
Resource Pressure:
Resource/trust/legitimacy meters become harder to maintain as demands increase and external support fluctuates.
Player mistakes or missed opportunities have compounding effects in later turns.
Decision Complexity:
Later turns present dilemmas with no perfect solutions, requiring trade-offs (e.g., sacrificing short-term stability for long-term reform).
Conditional scripted events force the player to adapt to evolving scenarios and consequences of earlier choices.
Adaptive AI/Scenario Logic:
The scenario engine may increase the frequency or severity of negative events if the player is performing too well, or offer limited recovery opportunities if struggling.
This scaling ensures the game remains engaging, challenging, and reflective of real-world complexity as the scenario unfolds.

- Can the player plan ahead or only react?
The player can both plan ahead and react. The scenario is designed to reward strategic foresight—players can analyze threat trends, resource needs, and alliance dynamics to set priorities, invest in preventive measures, and prepare for likely crises. At the same time, unexpected events, injects, and evolving threats require adaptive, reactive decision-making each turn. This balance encourages proactive planning (e.g., building trust, securing assets, pre-positioning resources) while maintaining tension and replayability through emergent challenges.

 5. Events, Injects & Transitions
- What are the most dramatic or memorable events possible?
•	Major coups or regime collapses (e.g., sudden military takeover in Mali or Burkina Faso)
•	Mass casualty attacks (e.g., Solhan Massacre, coordinated insurgent offensives)
•	Intelligence coups (e.g., exposing ISGS leadership compound, financial network takedowns)
•	Humanitarian catastrophes (e.g., famine, mass displacement, failed harvests)
•	International interventions or withdrawals (e.g., Wagner/France/ECOWAS actions)
•	Unexpected alliances or betrayals (e.g., AES splits, new pacts with Russia)

- How are injects triggered (random, conditional, player-driven)?
•	Random: Some injects are drawn from a pool to ensure unpredictability and replay value.
•	Conditional: Many are triggered by player actions, scenario state (e.g., low trust, high insurgency), or reaching certain thresholds.
•	Player-driven: Some injects are unlocked by specific player choices, investments, or intelligence gatherin

- Can events chain or cascade into others?
•	Yes, events can chain or cascade. For example, a failed negotiation may trigger a coup, which then leads to humanitarian crisis injects and new insurgent offensives.
•	Some events set “flags” that unlock or alter future injects, creating branching narrative paths and compounding consequences.

- Are there secret or hidden events?
•	There are hidden/secret events that only trigger if the player uncovers specific intelligence, meets rare conditions, or makes unusual choices (e.g., discovering a covert arms transfer, secret mediation opportunity, or hidden insurgent plot).
•	These add depth, surprise, and reward exploration or risk-taking.

- How are transitions between peace, crisis, and recovery handled?
•	Transitions are managed by scenario state variables (e.g., stability, insurgency, legitimacy, humanitarian status).
•	Peace: High stability, low insurgency, positive feedback events, opportunities for reconstruction and reform.
•	Crisis: Triggered by major attacks, coups, or cascading failures—injects become more severe, resources strained, urgent choices required.
•	Recovery: Achieved by sustained positive actions—injects shift to rebuilding, reconciliation, and long-term investment opportunities.
•	The UI and narrative feedback (e.g., news headlines, dashboards, event summaries) clearly signal these transitions, helping the player adapt strategy.

 6. Player Actions & Decisions
- What is the full menu of possible actions each turn?
•	Deploy Interventions:
o	Security (military, police, border control, counter-insurgency)
o	Humanitarian (food aid, medical, IDP camp support)
o	Economic (infrastructure, job programs, market stabilization)
o	Mediation (ethnic dialogue, peace talks, DDR programs)
o	Intelligence (surveillance, financial interdiction, information ops)
o	Climate/Resource (water management, climate adaptation, grazing land rehab)
•	Allocate Resources:
o	Assign limited budget, personnel, or assets to specific regions, crises, or projects.
•	Engage Actors:
o	Negotiate with state leaders, local elders, militia commanders, or international partners.
•	Issue Directives:
o	Set priorities (e.g., focus on food security vs. counter-insurgency)
o	Enact policies (e.g., human rights oversight, mining regulation)
•	Respond to Events/Injects:
o	Make urgent decisions in response to crises, attacks, or opportunities.
•	Monitor & Adjust:
o	Review intelligence, adjust ongoing operations, or reallocate resources.
•	Delegate/Automate:
o	Assign tasks to subordinates or automate routine operations (if allowed by scenario).
•	Skip/Pass:
o	Choose to take no action in a region or on a specific issue (with possible consequences).

- Are there irreversible or high-stakes decisions?
Yes. Examples include:
•	Military Intervention:
o	Deploying force in a region may escalate violence, cause civilian casualties, or close off negotiation options.
•	Sanctions or Aid Suspension:
o	Cutting off support to a state or actor can have long-term diplomatic or humanitarian impacts.
•	Negotiation Outcomes:
o	Signing peace deals, granting autonomy, or integrating ex-combatants may permanently alter the scenario.
•	Resource Commitment:
o	Spending a large portion of the budget or using unique assets (e.g., airlift, elite teams) may not be reversible.
•	Public Statements:
o	Making public commitments or accusations can lock the player into a path or trigger new crises.

- Can the player delegate, automate, or skip actions?
•	Delegate:
o	The player can assign certain tasks to trusted subordinates, local partners, or international agencies (with varying effectiveness and risk).
•	Automate:
o	Routine or low-impact actions (e.g., ongoing food distribution) can be automated, freeing up attention for urgent issues.
•	Skip:
o	The player may choose to skip actions in a region or on a specific issue, but this can lead to negative consequences (e.g., missed opportunities, worsening crises).

- How are resources spent, earned, or lost?
Spent:
Deploying interventions, funding programs, or responding to emergencies consumes budget, personnel, and political capital.
Earned:
Successes (e.g., stabilizing a region, winning support, securing funding from partners) can increase available resources or unlock new options.
Lost:
Failures, corruption, insurgent attacks, or poor decisions can deplete resources, reduce support, or trigger new costs (e.g., humanitarian crises, loss of territory).

- Are there time-limited or urgent choices?
Yes. The scenario includes:
•	Event/Inject Timers:
o	Some crises (e.g., famine, attacks, peace talks) require a decision within a set number of turns or will escalate/fail.
•	Urgent Opportunities:
o	Windows for negotiation, intervention, or resource deployment may close if not acted on quickly.
•	Cascading Consequences:
o	Delays can worsen humanitarian situations, allow insurgents to entrench, or cause diplomatic fallout.

 7. Feedback & Engagement
- How is feedback personalized to the player’s style or history?
•	Dynamic Briefings:
Intelligence and scenario updates reference the player’s past choices, e.g., “Your focus on humanitarian aid has improved civilian support in Central Mali.”
•	Adaptive Messaging:
Advisors and in-game characters comment on the player’s tendencies (e.g., aggressive, diplomatic, risk-averse).
•	Performance Summaries:
End-of-turn and milestone reports highlight patterns (“You consistently prioritize negotiation over force”).
•	Branching Outcomes:
The scenario evolves based on cumulative player actions, unlocking unique events or challenges.
- Are there visual, audio, or narrative cues for major impacts?
•	Visual Cues:
Map overlays change color or icons to reflect territory status, crises, or major achievements.
Pop-up banners or animated transitions for critical events (e.g., “Crisis Averted!” or “State Collapse!”).
•	Audio Cues:
Distinct sounds for positive (applause, uplifting music) or negative (alarms, somber tones) outcomes.
•	Narrative Cues:
Advisors deliver urgent or congratulatory messages in text or voice.
News headlines or social media feeds reflect major impacts.
- Can the player request advice or review past decisions?
•	Advice System:
The player can consult advisors for recommendations, risk assessments, or next steps.
Contextual hints are available for complex choices.
•	Decision Log:
An in-game journal or timeline records all major actions, decisions, and outcomes.
Players can review previous turns, see rationale, and learn from past mistakes.

How are failures or setbacks communicated?
•	Immediate Alerts:
Pop-up warnings, red map overlays, or urgent advisor messages signal failures (e.g., “Intervention Failed: Humanitarian Convoy Ambushed”).
•	Narrative Consequences:
Scenario text and briefings describe the fallout (“Civilian trust erodes after failed negotiation”).
•	Score/Resource Impact:
Losses are reflected in resource pools, territory control, or public support meters.
•	Media/News:
In-game news reports or social feeds highlight negative events and their causes.

- Are there in-game celebrations or commemorations for milestones?
•	Celebratory Visuals:
Fireworks, banners, or special map effects for major achievements (e.g., “Peace Accord Signed!”).
•	Narrative Recognition:
Advisors, local leaders, or international partners send congratulatory messages.
•	Achievement Badges:
Players unlock medals, titles, or trophies for key milestones.
•	Historical Log:
Major successes are recorded in a “Hall of Achievements” or timeline for replay and reflection.
 8. Scoring, Achievements & Leaderboards
- What hidden or bonus achievements exist?
•	Hidden Achievements:
“Peacemaker”: Resolve a major conflict without military intervention.
“Master Negotiator”: Successfully mediate between rival factions.
“Humanitarian Hero”: Prevent famine in all regions in a single playthrough.
“Intelligence Coup”: Uncover and disrupt a major insurgent funding network.
“Unity Builder”: Forge a lasting alliance between two historically opposed actors.
“No One Left Behind”: Achieve zero civilian casualties in a crisis event.
•	Bonus Achievements:
“Speedrun”: Stabilize the region in fewer than X turns.
“Resourceful”: Complete the scenario without using emergency funds.
“Comeback Kid”: Recover from a near-failure state to win.

- How are scores calculated for complex, multi-factor outcomes?
•	Scoring System:
Each turn, points are awarded/deducted based on:
Territory stability and threat reduction.
Civilian support and humanitarian outcomes.
Resource efficiency (budget, personnel, time).
Success/failure of interventions and negotiations.
Achievement of scenario objectives and bonus goals.
Avoidance of negative outcomes (e.g., state collapse, mass casualties).
•	Weighted Formula:
Final score = (Stability × 2) + (Humanitarian × 1.5) + (Resource Efficiency × 1) + (Achievements × 2) – (Failures × 2)
•	Complex Outcomes:
Multi-factor events (e.g., peace deals, major crises) use scenario-specific multipliers or bonuses.
- Can players compare stats with friends or rivals?
•	Leaderboards:
Global and friends-only leaderboards display top scores, fastest completions, and unique achievements.
Players can share stats, compare decision logs, and challenge friends to beat their outcomes.
•	Stat Comparison:
Detailed post-game breakdowns allow players to compare intervention choices, efficiency, and milestones.
- Are there seasonal or time-limited leaderboards?
•	Seasonal Leaderboards:
Special events or “seasons” (e.g., themed scenarios, real-world anniversaries) feature time-limited leaderboards.
Top performers receive exclusive badges, cosmetic rewards, or unlock new scenario variants.
•	Rotating Challenges:
Weekly/monthly challenges with unique modifiers and separate rankings.
- How are cheaters or exploits prevented?
•	Server-side validation of scores and achievements.
•	Integrity checks for save files and decision logs.
•	Detection of abnormal play patterns (e.g., impossible scores, rapid turn completion).
•	Regular updates to patch known exploits.
•	Reporting and review system for suspicious accounts.

 9. Debrief & Replayability
- What detailed analytics or breakdowns are shown at the end?
•	Comprehensive Scorecard:
Final score, rank, and achievement summary.
Turn-by-turn breakdown of key decisions, interventions, and their outcomes.
Region-by-region status: stability, humanitarian impact, resource use, and threat reduction.
Graphs/charts: trends in civilian support, territory control, resource efficiency, and crisis response.
Missed opportunities and critical turning points highlighted.
•	Comparative Metrics:
How the player’s performance compares to global averages, friends, or previous runs.
- Are there unlockable content or new modes after completion?
•	Cosmetic Unlocks:
New advisor avatars, map themes, or achievement badges.

- How are alternate histories or “what-if” scenarios visualized?
•	Branching Timeline Maps:
Interactive timeline showing key decision points and their consequences.
Each branch represents a major player choice (e.g., negotiation, military intervention, humanitarian focus).
Players can hover or click on branches to see alternate outcomes, such as changes in territorial control, humanitarian status, or insurgent strength.
•	Scenario Outcome Dashboards:
Side-by-side comparison panels displaying actual vs. alternate outcomes for key metrics (threat level, population at risk, food security, etc.).
Visual indicators (color-coded bars, icons) highlight differences resulting from alternate decisions.
•	Dynamic Region Maps:
Map overlays that change based on selected “what-if” paths (e.g., if gold mining is regulated, insurgent funding drops and territory control shifts).
Players can toggle between actual and alternate scenarios to see how the region would look under different interventions.
•	Event Replay & “Undo” Visualization:
Step-by-step replay of turns, with the ability to “rewind” and select a different action at a key moment.
The interface visually updates the map, stats, and narrative to reflect the new timeline.
•	Narrative Summaries:
Text-based or illustrated summaries describing the alternate history, highlighting major divergences and their impact on the region.
•	Achievement/Unlock Gallery:
Visual gallery of unlocked alternate histories, showing which “what-if” paths the player has discovered, encouraging replayability.

- Can players export or share their results?
They can’t export their results but they can share their results to various social media platforms
- How is player feedback collected for future updates?
Post-Game Debrief:
•	After completing a scenario, players are shown a summary screen with an option to provide detailed feedback, including open-ended comments and ratings for narrative, challenge, and usability.
Analytics & Telemetry:
•	Anonymous gameplay data is collected (with consent) to track player choices, drop-off points, and common failure states, highlighting areas needing improvement.

 10. Data & Technical Structure
- How will the JSON handle versioning and backward compatibility?
•	Include a top-level "version" field (e.g., "version": "1.2.0") in each JSON file.
•	Use semantic versioning (major.minor.patch). Increment major for breaking changes, minor for new features, patch for fixes.
•	Maintain a migration script or loader that can read older versions and upgrade them to the latest schema, ensuring backward compatibility.
- Are there modular or reusable data blocks (for events, actors, etc.)?
•	Define reusable templates for events, actors, assets, and injects (e.g., "eventTemplates", "actorProfiles").
•	Reference these templates by ID in scenario files, reducing duplication and easing updates.
•	Use arrays or objects for modular blocks (e.g., "events": [ { "ref": "event_raid" }, ... ]).
- How is data validated and error-checked?
•	Create a JSON Schema (draft-07 or newer) describing required fields, types, allowed values, and structure.
•	Use schema validation tools (e.g., AJV for Node.js, Python’s jsonschema) in your build/test pipeline to catch errors before runtime.
•	Add runtime validation in your loader to check for missing/invalid data and provide clear error messages.
- Can the structure support localization and accessibility?
•	Store all user-facing text in a separate localization object or external files (e.g., "locales/en.json", "locales/fr.json").
•	Reference text by key in the main JSON (e.g., "title": "event_raid_title").
•	Support right-to-left languages and Unicode.
•	For accessibility, include metadata for alt text, audio cues, and color contrast tags where relevant.
- How will future expansions or DLCs be integrated?
•	Design the structure to allow loading multiple scenario or content packs (e.g., "expansions": [ "sahel", "great_lakes" ]).
•	Use modular imports or references so new content can be added without modifying core files.
•	Reserve fields for future use (e.g., "extensions": {}), and document how new features should be added.
•	Ensure the loader can gracefully ignore unknown fields (forward compatibility).
 
11. Immersion, Realism & Ethics
- How is cultural, historical, and regional accuracy ensured?
•	Use primary sources, expert consultations, and local perspectives when designing scenarios, actors, and events.
•	Reference real-world data (as in your intelligence briefing) for population, ethnic composition, geography, and historical incidents.
•	Involve regional advisors or review panels to validate content and avoid stereotypes or inaccuracies.
- Are there ethical dilemmas or moral gray areas?
•	Present players with choices that have no perfect solution (e.g., prioritizing security vs. humanitarian aid, negotiating with armed groups, or managing scarce resources).
•	Reflect the complexity of real-world interventions, where every action has trade-offs and potential for unintended harm.
•	Avoid binary “good vs. evil” framing; instead, show the perspectives and motivations of all actors.
- How are sensitive topics (conflict, famine, politics) handled respectfully?
•	Use neutral, factual language for events involving violence, famine, or political upheaval.
•	Avoid sensationalism or graphic depictions; focus on the human impact and context.
•	Provide content warnings and allow players to skip or receive summaries of the most sensitive events.
- Can the player’s actions have unintended or emergent consequences?
•	Design systems where player actions can trigger ripple effects (e.g., a military intervention may stabilize one area but cause displacement or retaliation elsewhere).
•	Use branching scenarios and dynamic variables to allow for emergent outcomes, not just scripted results.
•	Track and communicate these consequences through feedback, debriefs, and scenario summaries.
- Are there in-game resources for learning more about real-world Sahel issues?
•	Include an in-game encyclopedia or “learn more” links for regions, actors, and issues, drawing from your intelligence briefing and reputable sources.
•	Offer optional sidebars, tooltips, or pop-ups with historical context, definitions, and further reading.
•	Encourage reflection and learning by connecting in-game events to real-world parallels in debriefs or endgame summaries.

 12. User Experience & Accessibility
•	Accessibility Features Needed:
Colorblind-friendly palettes and iconography (avoid color-only cues).
Text-to-speech and screen reader support for all UI and narrative text.
Adjustable text size, high-contrast mode, and font choices for readability.
Keyboard navigation and full remapping of controls.
Subtitles and captions for all audio, with adjustable speed.
Audio cues and haptic feedback for key events.
•	UI/UX Adaptation for Devices:
Responsive layouts that adjust to desktop, tablet, and mobile screen sizes.
Touch-friendly controls and larger tap targets for mobile/tablet.
Scalable UI elements and flexible menus for different resolutions.
Save/resume and cloud sync for cross-device play.
•	Difficulty Settings & Adaptive Challenges:
Multiple difficulty levels (e.g., narrative, standard, expert) affecting resource scarcity, event frequency, and AI behavior.
Optional adaptive difficulty: the game monitors player performance and adjusts challenge (e.g., offers hints, slows event pace, or increases/decreases threats).
Accessibility modes (e.g., “relaxed” mode with no fail states).
•	Progress Tracking & Display:
Clear turn/phase indicators and scenario progress bars.
In-game journals, logs, or maps showing completed and pending objectives.
Achievements, milestones, and scoreboards for replayability.
End-of-scenario debriefs summarizing choices, outcomes, and alternate paths.
•	Customization of Controls, Notifications, and Pacing:
Fully remappable controls (keyboard, mouse, touch).
Adjustable notification settings (visual, audio, vibration, frequency).
Options to speed up, pause, or slow down gameplay and narrative delivery.
Customizable UI themes and layouts for user preference.

 14. Analytics & Telemetry
•	What in-game analytics will be tracked for balancing or improvement?
•	Player choices per turn (selected actions, interventions, negotiation paths)
Resource usage and allocation (aid, security, reconstruction, etc.)
Outcomes: territory threat levels, population at risk, humanitarian status, stability, and support metrics after each turn
Achievement and failure rates (e.g., how often players secure critical assets, prevent famine, or fail missions)
Turn-by-turn score progression and final scores
Frequency and type of alternate history branches triggered
Time spent per decision, scenario, and overall session
Common points of player drop-off or scenario failure
Use of accessibility features and UI/UX interaction patterns
•	How will player choices and outcomes be anonymized and analyzed?
All analytics are stored without personal identifiers—only session IDs or randomized player tokens are used
Choices and outcomes are logged as aggregated data (e.g., “X% of players chose negotiation in Turn 3”)
Sensitive scenario outcomes (e.g., handling of ethnic conflict) are grouped to prevent re-identification
Data is encrypted in transit and at rest; only summary statistics are used for balancing
Opt-in consent for analytics is provided at game start, with clear privacy policy
•	Are there dashboards or tools for reviewing analytics?
Yes, a secure web-based analytics dashboard is provided for designers/admins
Dashboards display heatmaps of player choices, success/failure rates, and scenario progression funnels
•	Filters allow review by scenario, region, turn, and player segment (e.g., first-time vs. repeat players)
Export tools for CSV/JSON for deeper analysis in external tools (Excel, Power BI, etc.)
Real-time alerts for scenario bottlenecks or balance issues (e.g., if most players fail a specific turn)
Optional: In-game admin/debug overlay for live playtesting analytics

 15. Security & Data Privacy
- How is player data (progress, scores, profiles) stored and protected?
•	Player data is stored on secure, access-controlled servers using encryption at rest and in transit (e.g., HTTPS, AES-256).
•	Personally identifiable information (PII) is minimized or avoided; player profiles use pseudonymous IDs or tokens.
•	Regular security audits and access logging are implemented to detect unauthorized access.
•	Backups are encrypted and access is restricted to authorized personnel only.

- Are there options for data export, deletion, or privacy controls?
•	Players can export their data (progress, scores, choices) in a standard format (e.g., JSON or CSV) via an in-game or web portal.
•	Players can request account/data deletion, which triggers secure erasure of all associated records.
•	Privacy settings allow players to opt in/out of analytics, control visibility of scores/achievements, and manage profile information.
•	Clear privacy policy and consent prompts are provided at sign-up and in settings.

- How is compliance with data protection laws (e.g., GDPR) ensured?
•	Data collection is limited to what is necessary for gameplay and analytics, with explicit user consent.
•	Players have the right to access, correct, export, or delete their data at any time.
•	Data processing agreements and privacy notices are maintained and reviewed for legal compliance.
•	Data is stored in compliant jurisdictions, and third-party services are vetted for GDPR (or relevant law) adherence.

 16. Monetization (if relevant)
- Will there be in-app purchases, ads, or premium content?
No.
- How will monetization be balanced with fair play and accessibility?
No.
- Are there parental controls or spending limits?
No.

 17. Support & Documentation
1.	Is there in-game help, tooltips, or a tutorial system?
•	Yes. The onboarding modal will serve as the primary tutorial, guiding new players through core mechanics, scenario context, and first actions.
•	Contextual tooltips will be available throughout the UI, explaining buttons, metrics, and scenario elements on hover or tap.
•	An in-game help menu will provide quick access to rules, glossary, and gameplay tips at any time.
2.	How will updates, bug reports, and player support be handled?
•	Updates will be delivered via in-game notifications and changelogs, with optional auto-update for web/desktop versions.
•	Players can submit bug reports and feedback directly through an in-game form, which sends reports to the support/admin team.
•	A dedicated support email and/or ticketing system will be available for more complex issues.
3.	Is there a knowledge base or FAQ for players?
•	Yes. An in-game knowledge base/FAQ will be accessible from the main menu and help sections, covering common questions, scenario background, and troubleshooting.
•	The FAQ will be updated regularly based on player feedback and support trends.
•	Links to external resources (e.g., full documentation, community forums) may also be provided for deeper learning.

 18. Media (Audio, Visual, Narrative)
What types of media will be used (images, icons, maps, audio, video, animations)?
Static images (region/actor portraits, photos, scenario art, event illustrations)
Icons (flags, resources, actions, threat levels, achievements)
Interactive and static maps (territory, assets, scenario progress)
Audio (background music, sound effects, voiceover for briefings/cutscenes)
Video/animation (intro/outro cutscenes, animated transitions, event highlights)
UI/UX animations (feedback, notifications, tooltips)
•	How are media assets referenced or linked in the JSON?
Each scenario, event, actor, or turn object includes fields like "image", "icon", "audio", "video", or "map", referencing asset filenames or URLs (e.g., "image": "actors/tuareg_leader.png").
•	Media metadata (alt text, captions, language tags) is included as subfields for accessibility and localization.
•	Asset paths are relative to a central assets directory for easy management.
Are there unique visual or audio themes for different scenarios, events, or actors?
•	Yes. Each region/scenario has a distinct color palette, UI theme, and background music.
•	Actors and factions have unique portraits, icons, and audio cues.
•	Major events or scenario branches trigger special visual/audio effects to reinforce narrative impact.
How will cutscenes, briefings, or narrative sequences be presented?
•	Cutscenes and briefings are delivered as modal overlays or full-screen sequences, combining images, text, and audio/video.
•	Narrative sequences use animated text, voiceover, and background art, with optional subtitles.
•	Players can pause, skip, or replay these sequences from the in-game menu.
Are there accessibility considerations for media (captions, alt text, volume controls)?
•	All images and icons include descriptive alt text in the JSON.
•	Audio and video have captions/subtitles and volume controls.
•	Color contrast and font size are adjustable for visual accessibility.
•	Animations can be reduced or disabled in settings for sensitive users.
How will localization of media (subtitles, translated text, region-specific art) be handled?
•	Text for subtitles, captions, and UI is stored in localization files, referenced by language code.
•	Media assets can be region/language-specific (e.g., "image_fr", "audio_hausa").
•	The JSON references the correct localized asset or text based on player language/region settings.
What is the process for updating or expanding media assets in the future?
•	New assets are added to the assets directory and referenced in the JSON with versioning or unique IDs.
•	The game engine supports hot-reloading or patching of media without breaking existing scenarios.
•	Media updates are tracked in a changelog, and old assets are archived for rollback if needed.
•	Localization and accessibility metadata are updated alongside new or revised assets.

 Next Steps After Answering These Questions
- Organize your answers into a structured outline or design document.
- Draft a detailed JSON schema or template based on your responses.
- Begin populating the JSON with sample data for each section (turns, actors, events, etc.).
- Review and iterate on the data structure for completeness and clarity.
- Validate the JSON for syntax and logical consistency.
- Integrate the JSON into your game engine or prototype for testing.
- Playtest and refine based on feedback and gameplay experience.
- Document the data structure for future contributors or expansions.

