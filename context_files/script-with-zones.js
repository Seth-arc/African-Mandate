// African Mandate: Sahel Arena - Interactive Gameplay Script

// ===== GAME STATE =====
let gameState = {
    act: 1,
    turn: 1,
    maxTurns: 12,
    actionsRemaining: 3,
    maxActions: 3,
    resources: {
        budget: 45.2,
        politicalCapital: 68,
        personnel: 2450,
        intelPoints: 12,
        timeMonths: 36
    },
    metrics: {
        stability: 52,
        insurgency: 67,
        civilianSupport: 48,
        globalLegitimacy: 71,
        regionalSynergy: 62
    },
    ai: {
        oppositionPressure: 58,
        intelConfidence: 62,
        actorSentiments: {
            auCommissioner: 65,
            goita: 45,
            jnim: 18,
            ecowas: 60,
            tuareg: 50,
            burkinaJunta: 40,
            burkinaCivil: 60,
            nigerJunta: 45,
            nigerHumanitarian: 62,
            chadTransitional: 55,
            mauritaniaIntel: 58,
            wagner: 12
        }
    },
    territories: {
        mali: { name: 'Mali', status: 'Critical', stability: 42, insurgency: 78, population: '21.9M', flag: '../img/flags/Flag_of_Mali.svg', coords: [17.57, -3.99] },
        burkinaFaso: { name: 'Burkina Faso', status: 'Unstable', stability: 48, insurgency: 72, population: '22.1M', flag: '../img/flags/Flag_of_Burkina_Faso.svg', coords: [12.23, -1.56] },
        niger: { name: 'Niger', status: 'Tense', stability: 55, insurgency: 65, population: '25.3M', flag: '../img/flags/Flag_of_Niger.svg', coords: [17.60, 8.08] },
        chad: { name: 'Chad', status: 'Volatile', stability: 50, insurgency: 58, population: '17.2M', flag: '../img/flags/Flag_of_Chad.svg', coords: [15.45, 18.73] },
        mauritania: { name: 'Mauritania', status: 'Stable', stability: 68, insurgency: 35, population: '4.8M', flag: '../img/flags/Flag_of_Mauritania.svg', coords: [21.00, -10.94] }
    },
    currentTerritory: null,
    timer: {
        totalSeconds: 900, // 15 minutes
        remainingSeconds: 900,
        isRunning: false,
        intervalId: null
    },
    actionsTaken: []
};

// Zone coordinates
const zoneCoordinates = {
    goundam: '16.67°N, 3.67°W',
    kidal: '18.44°N, 1.41°E',
    timbuktu: '16.77°N, 3.01°W',
    mopti: '14.49°N, 4.20°W',
    dori: '14.03°N, 0.03°W',
    ouahigouya: '13.58°N, 2.43°W',
    djibo: '14.10°N, 1.63°W',
    diffa: '13.32°N, 12.61°E',
    agadez: '16.97°N, 7.99°E',
    tillaberi: '14.21°N, 1.45°E',
    ndjamena: '12.11°N, 15.04°E',
    lac: '13.50°N, 14.10°E',
    nouakchott: '18.07°N, 15.98°W',
    nema: '16.62°N, 7.26°W'
};

// Tactical intel markers for the map (real-world coordinates, approximate)
const mapIntelData = [
    {
        id: 'militia-goundam',
        type: 'militia',
        name: 'JNIM Forward Cell',
        coords: [16.67, -3.67],
        details: 'Mobile unit operating near Goundam.'
    },
    {
        id: 'militia-djibo',
        type: 'militia',
        name: 'JNIM Siege Elements',
        coords: [14.10, -1.63],
        details: 'Insurgent siege lines around Djibo.'
    },
    {
        id: 'militia-lakechad',
        type: 'militia',
        name: 'ISWAP Patrol Corridor',
        coords: [13.50, 14.10],
        details: 'Armed patrols along Lake Chad Basin.'
    },
    {
        id: 'idp-dori',
        type: 'idp',
        name: 'IDP Camp - Dori',
        coords: [14.03, -0.03],
        details: 'Approx. 20K displaced persons.'
    },
    {
        id: 'idp-mopti',
        type: 'idp',
        name: 'Mopti IDP Reception',
        coords: [14.49, -4.20],
        details: 'Overcrowded intake center.'
    },
    {
        id: 'idp-diffa',
        type: 'idp',
        name: 'Diffa Displacement Site',
        coords: [13.32, 12.61],
        details: 'New influx from cross-border violence.'
    },
    {
        id: 'illicit-agadez',
        type: 'illicit',
        name: 'Smuggling Route Node',
        coords: [16.97, 7.99],
        details: 'Arms and migrant trafficking hub.'
    },
    {
        id: 'illicit-tillaberi',
        type: 'illicit',
        name: 'Cross-border Smuggling',
        coords: [14.21, 1.45],
        details: 'Black-market fuel and weapons.'
    },
    {
        id: 'illicit-nouakchott',
        type: 'illicit',
        name: 'Coastal Financing Network',
        coords: [18.07, -15.98],
        details: 'Illicit finance channel supporting networks.'
    }
];

// Intelligence Reports
const intelReports = {
    wagner: {
        headline: 'Wagner Group Contractors Spotted in Northern Burkina Faso',
        subheadline: 'Russian military presence expanding across Sahel as juntas seek alternatives to Western security partnerships',
        source: 'AU Field Intelligence',
        location: 'Northern Burkina Faso',
        threat: 'High',
        urgency: 'Immediate Action Required',
        image: '../img/intelligence_feed/Wagner Group contractors have been observed operating in multiple Sahel nations since 2021.png',
        imageCaption: 'Wagner Group contractors have been observed operating in multiple Sahel nations since 2021',
        content: `
            <p class="report-paragraph">Wagner Group private military contractors have been identified operating in northern Burkina Faso near the city of Ouahigouya, according to multiple intelligence sources. The presence of an estimated 200-300 Russian contractors marks a significant expansion of Moscow's security footprint in the region.</p>
            
            <p class="report-paragraph">Intelligence indicates these forces are providing training, tactical support, and possibly direct combat operations alongside Burkina Faso's military junta. Their deployment follows similar patterns observed in Mali, where Wagner has maintained a presence since late 2021.</p>
            
            <h3 class="report-section-title">Strategic Implications</h3>
            
            <p class="report-paragraph">This development represents a fundamental shift in the regional security architecture. As France continues its military withdrawal from the Sahel and Western partnerships deteriorate with junta-led governments, Russia is positioning itself as an alternative security partner with fewer political conditions.</p>
            
            <div class="report-pullquote">"Wagner's expansion threatens to undermine African-led security frameworks and creates new dependencies that could compromise regional sovereignty." — Dr. Amina Konaté, AU Security Analyst</div>
            
            <p class="report-paragraph">The Wagner model differs fundamentally from traditional peacekeeping operations. Contractors operate with minimal transparency, limited accountability, and strategic objectives aligned with Russian geopolitical interests rather than sustainable peace.</p>
            
            <div class="report-infobox">
                <div class="report-infobox-title">Wagner Group in the Sahel: Timeline</div>
                <ul class="report-list">
                    <li><strong>December 2021:</strong> First Wagner contractors arrive in Mali</li>
                    <li><strong>March 2022:</strong> Forces estimated at 1,000+ in Mali</li>
                    <li><strong>August 2023:</strong> Wagner presence confirmed in Burkina Faso</li>
                    <li><strong>January 2026:</strong> Expansion to northern operations confirmed</li>
                </ul>
            </div>
            
            <h3 class="report-section-title">Recommended Actions</h3>
            
            <p class="report-paragraph">The AU must respond strategically to this challenge. Military confrontation with Wagner forces would be counterproductive and dangerous. Instead, focus should center on:</p>
            
            <ul class="report-list">
                <li>Strengthening African-led security frameworks to offer credible alternatives</li>
                <li>Engaging junta leaders on sovereignty concerns related to Wagner dependency</li>
                <li>Coordinating with ECOWAS on unified regional response</li>
                <li>Monitoring Wagner human rights violations to build international pressure</li>
                <li>Investing in local security capacity to reduce perceived need for external contractors</li>
            </ul>
            
            <p class="report-paragraph">Time is critical. As Wagner embeds deeper into national security structures, extricating these forces becomes exponentially more difficult. The AU's window for effective response is narrowing.</p>
        `,
        sources: 'AU Regional Bureau for the Sahel, ECOWAS Security Network, National Intelligence Services (Mali, Burkina Faso, Niger), Open Source Intelligence, Satellite Imagery Analysis'
    },
    ecowas: {
        headline: 'ECOWAS Summit Postponed Indefinitely',
        subheadline: 'Regional bloc struggles with internal divisions as junta-led states form alternative coalition',
        source: 'ECOWAS Communications',
        location: 'Abuja, Nigeria',
        threat: 'Medium',
        urgency: 'Diplomatic Priority',
        image: '../img/intelligence_feed/ECOWAS headquarters in Abuja.png',
        imageCaption: 'ECOWAS headquarters in Abuja faces unprecedented challenges to regional unity',
        content: `
            <p class="report-paragraph">The Economic Community of West African States has indefinitely postponed its planned emergency summit on Sahel security, citing "scheduling conflicts" among member state leaders. Sources indicate the real reason is deeper: fundamental disagreements over how to respond to military coups and whether to engage with junta governments.</p>
            
            <p class="report-paragraph">Mali, Burkina Faso, and Niger—all currently under military rule—have formed an alternative "Alliance of Sahel States" that explicitly rejects ECOWAS oversight. This unprecedented challenge to regional authority threatens the bloc's foundational principle of democratic governance.</p>
            
            <h3 class="report-section-title">The Legitimacy Crisis</h3>
            
            <p class="report-paragraph">ECOWAS faces a paradox: the organization exists to promote regional integration and stability, yet its strongest policy tool—sanctions and threat of military intervention—may be accelerating regional fragmentation. Junta leaders argue sanctions harm ordinary citizens while failing to restore democracy.</p>
            
            <div class="report-pullquote">"We cannot bomb our way to democracy. ECOWAS must recognize that engagement, not isolation, offers the only path forward." — Ibrahim Salifu, ECOWAS Director of Political Affairs</div>
            
            <div class="report-infobox">
                <div class="report-infobox-title">ECOWAS Member State Positions</div>
                <ul class="report-list">
                    <li><strong>Nigeria:</strong> Advocates strong stance against coups but increasingly isolated</li>
                    <li><strong>Senegal:</strong> Supports dialogue-first approach with conditional engagement</li>
                    <li><strong>Ghana:</strong> Concerned about economic impact of sanctions</li>
                    <li><strong>Côte d'Ivoire:</strong> Fears spillover instability but opposes military intervention</li>
                    <li><strong>Guinea:</strong> Under sanctions itself, sympathy for junta positions</li>
                </ul>
            </div>
            
            <h3 class="report-section-title">Strategic Recommendations</h3>
            
            <p class="report-paragraph">The AU is uniquely positioned to bridge this divide. Unlike ECOWAS, the AU has maintained channels with all parties and retains credibility as a continental rather than sub-regional actor. Recommended approach:</p>
            
            <ul class="report-list">
                <li>Convene parallel AU-ECOWAS consultations to align strategies</li>
                <li>Propose phased sanctions relief linked to specific democratic milestones</li>
                <li>Establish AU Special Envoy meetings with Alliance of Sahel States leadership</li>
                <li>Create incentive structure for constitutional transition timelines</li>
                <li>Strengthen regional early warning systems to prevent future coups</li>
            </ul>
            
            <p class="report-paragraph">Regional unity is essential for effective crisis response. A fractured ECOWAS undermines all Sahel stabilization efforts.</p>
        `,
        sources: 'ECOWAS Official Communications, AU Peace and Security Council, National Foreign Ministries, Regional Media Analysis'
    },
    climate: {
        headline: 'Sahel Climate Crisis Accelerating Food Insecurity',
        subheadline: '40% drop in agricultural yields threatens to displace millions, creating new security threats',
        source: 'AU Climate Observatory',
        location: 'Sahel Region-Wide',
        threat: 'Critical',
        urgency: 'Long-term Systemic',
        image: '../img/intelligence_feed/Drought conditions across the Sahel.png',
        imageCaption: 'Drought conditions across the Sahel have reached worst levels in 30 years',
        content: `
            <p class="report-paragraph">New climate data reveals agricultural yields across the Sahel have declined 40% compared to five-year averages, threatening food security for an estimated 11 million people. This isn't merely a humanitarian crisis—it's a security crisis with profound implications for regional stability.</p>
            
            <p class="report-paragraph">The climate-security nexus operates through multiple channels. Resource scarcity drives competition between agricultural and pastoral communities. Youth unemployment from agricultural collapse creates insurgent recruitment opportunities. Mass displacement strains urban infrastructure and governance capacity.</p>
            
            <h3 class="report-section-title">The Feedback Loop</h3>
            
            <p class="report-paragraph">Climate stress and insecurity reinforce each other in a destructive cycle. Farmers cannot plant when insurgents control territory. Pastoralists' migration patterns are disrupted by conflict, leading to overgrazing and land degradation. Government capacity to respond to climate challenges is consumed by security threats.</p>
            
            <div class="report-pullquote">"We cannot separate climate policy from security policy in the Sahel. They are the same challenge, requiring integrated solutions." — AU Environment and Security Working Group</div>
            
            <div class="report-infobox">
                <div class="report-infobox-title">Climate Impact by Territory</div>
                <ul class="report-list">
                    <li><strong>Mali:</strong> 3.2M facing acute food insecurity, 35% livestock mortality in northern regions</li>
                    <li><strong>Burkina Faso:</strong> 2.7M requiring food assistance, grain prices up 60% year-over-year</li>
                    <li><strong>Niger:</strong> 4.1M food insecure, malnutrition rates exceeding emergency thresholds</li>
                    <li><strong>Chad:</strong> Lake Chad Basin shrinkage affecting 2M fishing/farming livelihoods</li>
                </ul>
            </div>
            
            <h3 class="report-section-title">Required Response</h3>
            
            <p class="report-paragraph">Traditional humanitarian assistance, while necessary, is insufficient. The AU must champion a comprehensive approach that addresses both immediate needs and systemic vulnerabilities:</p>
            
            <ul class="report-list">
                <li>Scale climate-resilient agriculture programs in accessible zones</li>
                <li>Establish protected humanitarian corridors for aid delivery</li>
                <li>Create cash transfer programs to prevent distress migration</li>
                <li>Integrate climate adaptation into all security planning</li>
                <li>Develop regional water-sharing agreements to prevent resource conflicts</li>
                <li>Support youth employment programs in renewable energy and conservation</li>
            </ul>
            
            <p class="report-paragraph">The international community has pledged billions for Sahel climate adaptation. The AU must ensure these funds reach communities and are integrated with security strategies, not siloed in separate ministries.</p>
            
            <p class="report-paragraph">Climate security is long-term security. Ignoring it means fighting the same conflicts for generations.</p>
        `,
        sources: 'AU Climate Observatory, National Meteorological Services, UN Food and Agriculture Organization, World Food Programme, Regional Agricultural Assessments'
    },
    french: {
        headline: 'France Announces Final Military Withdrawal from Niger',
        subheadline: 'End of Operation Barkhane creates security vacuum as regional forces struggle to fill gap',
        source: 'French Ministry of Defense',
        location: 'Niamey, Niger',
        threat: 'High',
        urgency: 'Immediate',
        image: '../img/intelligence_feed/French forces have maintained Sahel presence since 2013.png',
        imageCaption: 'French forces have maintained Sahel presence since 2013 Operation Serval in Mali',
        content: `
            <p class="report-paragraph">France has confirmed the withdrawal of its remaining 1,500 troops from Niger by March 2026, marking the complete end of Operation Barkhane that once deployed 5,000 soldiers across the Sahel. The announcement, while expected, accelerates a security transition that regional forces are ill-prepared to manage.</p>
            
            <p class="report-paragraph">Operation Barkhane, launched in 2014, provided critical counterterrorism capabilities including intelligence, surveillance, reconnaissance, and rapid reaction forces. French aircraft, drones, and special forces conducted hundreds of operations against jihadi groups. While controversial and often criticized for neocolonial overtones, the operation filled real capability gaps.</p>
            
            <h3 class="report-section-title">The Security Vacuum</h3>
            
            <p class="report-paragraph">The question isn't whether French withdrawal is justified—rising anti-French sentiment and junta hostility made continued presence politically untenable. The question is: who fills the vacuum? Three actors are competing:</p>
            
            <div class="report-infobox">
                <div class="report-infobox-title">Post-Barkhane Security Landscape</div>
                <ul class="report-list">
                    <li><strong>G5 Sahel Joint Force:</strong> Underfunded, underequipped, struggling coordination</li>
                    <li><strong>Wagner Group:</strong> Expanding presence with Russian backing, limited accountability</li>
                    <li><strong>ECOWAS Standby Force:</strong> Exists on paper but lacks deployment capacity</li>
                    <li><strong>National Armies:</strong> Varied capability, often part of the problem (coups)</li>
                </ul>
            </div>
            
            <p class="report-paragraph">None of these actors can currently replicate Barkhane's counterterrorism capacity. Intelligence agencies predict a 6-12 month period of increased jihadist activity as groups test the new security environment.</p>
            
            <div class="report-pullquote">"The French departure is both opportunity and crisis. Opportunity for African-led security, crisis if we cannot deliver." — Senior AU Military Official</div>
            
            <h3 class="report-section-title">Strategic Imperatives</h3>
            
            <p class="report-paragraph">The AU cannot replace French military capacity overnight. But it can pursue a smarter strategy focused on what works:</p>
            
            <ul class="report-list">
                <li>Prioritize intelligence sharing and coordination over large-scale combat operations</li>
                <li>Invest in border security to disrupt jihadist movement networks</li>
                <li>Support community-based security initiatives that provide local intelligence</li>
                <li>Accelerate training programs for national forces (not just equipment transfers)</li>
                <li>Establish rapid reaction capabilities within G5 Sahel framework</li>
                <li>Negotiate sustainable international support (logistics, ISR) without political strings</li>
            </ul>
            
            <p class="report-paragraph">The Barkhane transition is a test case for African security autonomy. Success requires acknowledging limitations while building realistic alternatives. Failure means either continued instability or new dependencies on actors like Russia with different agendas.</p>
            
            <p class="report-paragraph">The AU has approximately 90 days to demonstrate it can manage post-withdrawal security. Every jihadist attack during this period will be scrutinized as evidence of African capacity—or its absence.</p>
        `,
        sources: 'French Ministry of Defense, AU Regional Bureau, G5 Sahel Secretariat, National Defense Ministries, International Security Assessments'
    }
};

// ===== ZONE DATA =====
const zonesData = {
    mali: [
        {
            id: 'goundam',
            name: 'Goundam',
            type: 'Urban Center',
            image: null,
            threat: 'Critical',
            population: '50K',
            insurgency: 85,
            displaced: '12K',
            description: 'Regional capital under JNIM siege. Heavy fighting ongoing with civilian population trapped.',
            situation: 'JNIM forces launching coordinated offensive. City under siege with 50,000 civilians trapped. Malian military forces poorly positioned and requesting immediate support. Humanitarian catastrophe imminent without intervention.',
            threats: [
                '<strong>JNIM Offensive:</strong> 300+ fighters mobilized for city assault',
                '<strong>Civilian Casualties:</strong> High risk of collateral damage in urban combat',
                '<strong>Supply Lines Cut:</strong> Food and medical access severely restricted'
            ],
            incidents: ['Armed Assault', 'IED Attacks', 'Humanitarian Crisis']
        },
        {
            id: 'kidal',
            name: 'Kidal',
            type: 'Strategic City',
            image: '../img/zones/Mali/Kidal Strategic City - Mali.png',
            threat: 'Critical',
            population: '35K',
            insurgency: 78,
            displaced: '8K',
            description: 'Tuareg stronghold with complex ethnic dynamics. Wagner Group presence complicating situation.',
            situation: 'Historically contested region between government forces, Tuareg separatists, and jihadist groups. Current instability driven by competing claims to territorial control and resource access.',
            threats: [
                '<strong>Ethnic Tensions:</strong> Tuareg-government relations deteriorating',
                '<strong>Wagner Presence:</strong> Russian contractors operating with junta approval',
                '<strong>Separatist Activity:</strong> CMA militia asserting territorial control'
            ],
            incidents: ['Ethnic Violence', 'Border Skirmishes', 'Checkpoint Attacks']
        },
        {
            id: 'timbuktu',
            name: 'Timbuktu',
            type: 'Cultural Center',
            image: '../img/zones/Mali/Timbuktu Cultural Center - Mali.png',
            threat: 'High',
            population: '65K',
            insurgency: 68,
            displaced: '15K',
            description: 'Historic city facing cultural heritage destruction. UNESCO sites under threat from extremist groups.',
            situation: 'Ancient manuscripts and historic sites targeted by jihadist groups. Local population caught between preserving cultural identity and ensuring physical security.',
            threats: [
                '<strong>Cultural Destruction:</strong> UNESCO World Heritage sites at risk',
                '<strong>Religious Extremism:</strong> Enforcement of strict interpretations threatening traditions',
                '<strong>Economic Collapse:</strong> Tourism sector destroyed, livelihoods decimated'
            ],
            incidents: ['Heritage Destruction', 'Religious Persecution', 'Market Attacks']
        },
        {
            id: 'mopti',
            name: 'Mopti',
            type: 'Trade Hub',
            image: '../img/zones/Mali/Mopti Trade Hub - Mali.png',
            threat: 'High',
            population: '120K',
            insurgency: 62,
            displaced: '25K',
            description: 'Critical logistics center for humanitarian operations. Frequent attacks disrupting aid distribution.',
            situation: 'Strategic importance as central Mali hub creates target for multiple armed groups. Civilian casualties rising as city becomes battleground for territorial control.',
            threats: [
                '<strong>Aid Route Attacks:</strong> Humanitarian convoys targeted repeatedly',
                '<strong>Market Bombings:</strong> Civilian gathering places hit by explosives',
                '<strong>Ethnic Militias:</strong> Dogon and Fulani armed groups in conflict'
            ],
            incidents: ['Market Bombings', 'Convoy Attacks', 'Ethnic Clashes']
        }
    ],
    burkinaFaso: [
        {
            id: 'dori',
            name: 'Dori',
            type: 'Border Town',
            image: '../img/zones/Burkina Faso/Dori Border Town - Burkina Faso.png',
            threat: 'Critical',
            population: '45K',
            insurgency: 82,
            displaced: '20K',
            description: 'Major IDP camp location. Junta blocking humanitarian access causing health crisis.',
            situation: 'Border closure by military government preventing aid delivery to 30,000 displaced persons. Medical supplies depleted, disease outbreak imminent within three weeks.',
            threats: [
                '<strong>Humanitarian Blockade:</strong> Junta preventing aid access',
                '<strong>Disease Outbreak:</strong> Cholera and measles risk in overcrowded camps',
                '<strong>Food Insecurity:</strong> Malnutrition rates exceeding emergency thresholds'
            ],
            incidents: ['Aid Blockade', 'Disease Outbreak', 'Protests']
        },
        {
            id: 'ouahigouya',
            name: 'Ouahigouya',
            type: 'Regional Capital',
            image: '../img/zones/Burkina Faso/Ouahigouya Regional Capital - Burkina Faso.png',
            threat: 'High',
            population: '75K',
            insurgency: 70,
            displaced: '12K',
            description: 'Junta administrative center. Heavy military presence but civilian support declining.',
            situation: 'Military government consolidating power while facing growing civilian resistance. Economic conditions deteriorating, creating instability despite security apparatus.',
            threats: [
                '<strong>Civil Unrest:</strong> Protests against military rule increasing',
                '<strong>Economic Crisis:</strong> International sanctions impacting services',
                '<strong>Youth Radicalization:</strong> Unemployment driving insurgent recruitment'
            ],
            incidents: ['Civil Protests', 'Army Crackdown', 'Recruitment Activity']
        },
        {
            id: 'djibo',
            name: 'Djibo',
            type: 'Isolated Town',
            image: '../img/zones/Burkina Faso/Djibo Isolated Town - Burkina Faso.png',
            threat: 'Critical',
            population: '28K',
            insurgency: 88,
            displaced: '8K',
            description: 'Completely besieged by JNIM. Emergency airlift only access route.',
            situation: 'Town surrounded for months, accessible only by helicopter. Population facing starvation, medical emergencies mounting. Represents humanitarian crisis at its most acute.',
            threats: [
                '<strong>Complete Siege:</strong> No ground access for 4+ months',
                '<strong>Starvation Risk:</strong> Food stocks critically depleted',
                '<strong>Medical Emergency:</strong> No surgical capacity, casualties mounting'
            ],
            incidents: ['Siege', 'Starvation', 'Medical Crisis']
        }
    ],
    niger: [
        {
            id: 'diffa',
            name: 'Diffa',
            type: 'Border Region',
            image: '../img/zones/Niger/Diffa Border Region - Niger.png',
            threat: 'Critical',
            population: '82K',
            insurgency: 75,
            displaced: '30K',
            description: 'Ethnic tensions escalating toward potential atrocities. Fulani-Kanuri conflict critical.',
            situation: 'ISGS attacks on Fulani communities sparking reprisal militia formation. Kanuri leaders threatening "cleansing operations." 15,000 Fulani in immediate danger of mass violence.',
            threats: [
                '<strong>Ethnic Cleansing Risk:</strong> Potential mass atrocity event imminent',
                '<strong>Militia Formation:</strong> Vigilante groups arming rapidly',
                '<strong>Civilian Targeting:</strong> Collective punishment logic spreading'
            ],
            incidents: ['Ethnic Violence', 'Militia Attacks', 'Mass Displacement']
        },
        {
            id: 'agadez',
            name: 'Agadez',
            type: 'Desert City',
            image: '../img/zones/Niger/Agadez Desert City - Niger.png',
            threat: 'Moderate',
            population: '125K',
            insurgency: 45,
            displaced: '10K',
            description: 'Migration hub and smuggling routes. Complex transnational criminal networks.',
            situation: 'Key transit point for Saharan migration and trafficking. Relatively stable but criminal networks create governance challenges and potential for instability.',
            threats: [
                '<strong>Human Trafficking:</strong> Migration routes exploited by criminal networks',
                '<strong>Arms Smuggling:</strong> Weapons flowing to conflict zones',
                '<strong>Corruption:</strong> Official complicity in illicit trade'
            ],
            incidents: ['Trafficking', 'Smuggling', 'Border Incidents']
        },
        {
            id: 'tillaberi',
            name: 'Tillabéri',
            type: 'Tri-border Area',
            image: null,
            threat: 'High',
            population: '55K',
            insurgency: 72,
            displaced: '18K',
            description: 'Strategic location at Mali-Burkina-Niger intersection. ISGS stronghold.',
            situation: 'Porous borders allowing insurgent movement between three countries. ISGS using region as operational base for coordinated attacks across borders.',
            threats: [
                '<strong>Cross-border Insurgency:</strong> ISGS coordinating regional operations',
                '<strong>Border Permeability:</strong> Unable to control insurgent movement',
                '<strong>Coordination Failure:</strong> Three nations struggling to cooperate'
            ],
            incidents: ['Cross-border Raids', 'Checkpoint Attacks', 'Kidnappings']
        }
    ],
    chad: [
        {
            id: 'ndjamena',
            name: "N'Djamena",
            type: 'Capital City',
            image: '../img/zones/Chad/N\'Djamena Capital City - Chad.png',
            threat: 'Moderate',
            population: '1.2M',
            insurgency: 35,
            displaced: '45K',
            description: 'Political center balancing relations with multiple external powers. Relatively stable hub.',
            situation: 'Capital serves as regional operations base for international partners. Transitional government maintaining fragile stability while managing external relationships.',
            threats: [
                '<strong>Political Instability:</strong> Delayed elections creating legitimacy questions',
                '<strong>Rebel Groups:</strong> Northern opposition movements periodically active',
                '<strong>Urban Influx:</strong> Rural displacement straining city infrastructure'
            ],
            incidents: ['Political Protests', 'Rebel Incursions', 'Infrastructure Strain']
        },
        {
            id: 'lac',
            name: 'Lake Chad Basin',
            type: 'Strategic Region',
            image: '../img/zones/Chad/Lake Chad Basin Strategic Region - Chad.png',
            threat: 'High',
            population: '200K',
            insurgency: 68,
            displaced: '85K',
            description: 'Boko Haram and ISWAP presence. Regional security coordination essential.',
            situation: 'Shared water resource creating both livelihood dependencies and security vulnerabilities. Multi-national forces operating against entrenched insurgent networks.',
            threats: [
                '<strong>ISWAP Activity:</strong> Islamic State affiliate conducting attacks',
                '<strong>Environmental Stress:</strong> Lake shrinkage creating resource competition',
                '<strong>Regional Coordination:</strong> Four nations struggling to synchronize operations'
            ],
            incidents: ['Insurgent Attacks', 'Fishing Village Raids', 'Military Operations']
        }
    ],
    mauritania: [
        {
            id: 'nouakchott',
            name: 'Nouakchott',
            type: 'Capital City',
            image: '../img/zones/Mauritania/Nouakchott Capital City - Mauritania.png',
            threat: 'Low',
            population: '1.3M',
            insurgency: 25,
            displaced: '12K',
            description: 'Stable democratic government. Model for regional cooperation and intelligence sharing.',
            situation: 'Successful counterterrorism and de-radicalization programs serving as regional model. Economic development improving despite Sahel challenges.',
            threats: [
                '<strong>Spillover Risk:</strong> Potential for conflict spread from neighbors',
                '<strong>Economic Pressure:</strong> Regional instability affecting trade',
                '<strong>Radicalization:</strong> Low but persistent recruitment attempts'
            ],
            incidents: ['Isolated Incidents', 'Border Security', 'Refugee Influx']
        },
        {
            id: 'nema',
            name: 'Néma',
            type: 'Border Town',
            image: '../img/zones/Mauritania/Néma Border Town - Mauritania.png',
            threat: 'Moderate',
            population: '35K',
            insurgency: 42,
            displaced: '5K',
            description: 'Eastern border monitoring post. Intelligence gathering critical for regional operations.',
            situation: 'Strategic surveillance location for monitoring Mali insurgent activity. Coordinating with international partners on cross-border tracking.',
            threats: [
                '<strong>Border Infiltration:</strong> Militants crossing from Mali',
                '<strong>Surveillance Gaps:</strong> Limited resources for comprehensive monitoring',
                '<strong>Community Tensions:</strong> Cross-border ethnic ties complicating security'
            ],
            incidents: ['Border Crossings', 'Intelligence Gathering', 'Occasional Attacks']
        }
    ]
};

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(title, message, isUrgent = false) {
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');

    notificationTitle.textContent = title;
    notificationMessage.textContent = message;

    if (isUrgent) {
        notification.classList.add('urgent');
    } else {
        notification.classList.remove('urgent');
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// ===== UPDATE UI FUNCTIONS =====
function updateMetrics() {
    // Update stability bar
    const stabilityFill = document.querySelector('.metric-item:nth-child(1) .metric-fill');
    const stabilityValue = document.querySelector('.metric-item:nth-child(1) .metric-value');
    if (stabilityFill && stabilityValue) {
        stabilityFill.style.width = gameState.metrics.stability + '%';
        stabilityValue.textContent = gameState.metrics.stability + '/100';
    }

    // Update insurgency bar
    const insurgencyFill = document.querySelector('.metric-item:nth-child(2) .metric-fill');
    const insurgencyValue = document.querySelector('.metric-item:nth-child(2) .metric-value');
    if (insurgencyFill && insurgencyValue) {
        insurgencyFill.style.width = gameState.metrics.insurgency + '%';
        insurgencyValue.textContent = gameState.metrics.insurgency + '/100';
    }

    // Update civilian support bar
    const civilianFill = document.querySelector('.metric-item:nth-child(3) .metric-fill');
    const civilianValue = document.querySelector('.metric-item:nth-child(3) .metric-value');
    if (civilianFill && civilianValue) {
        civilianFill.style.width = gameState.metrics.civilianSupport + '%';
        civilianValue.textContent = gameState.metrics.civilianSupport + '/100';
    }

    // Update global legitimacy bar
    const legitimacyFill = document.querySelector('.metric-item:nth-child(4) .metric-fill');
    const legitimacyValue = document.querySelector('.metric-item:nth-child(4) .metric-value');
    if (legitimacyFill && legitimacyValue) {
        legitimacyFill.style.width = gameState.metrics.globalLegitimacy + '%';
        legitimacyValue.textContent = gameState.metrics.globalLegitimacy + '/100';
    }

    // Update regional synergy bar
    const synergyFill = document.querySelector('.metric-item:nth-child(5) .metric-fill');
    const synergyValue = document.querySelector('.metric-item:nth-child(5) .metric-value');
    if (synergyFill && synergyValue) {
        synergyFill.style.width = gameState.metrics.regionalSynergy + '%';
        synergyValue.textContent = (gameState.metrics.regionalSynergy / 100).toFixed(2);
    }
}

function updateResources() {
    const resourceItems = document.querySelectorAll('.resource-item');
    if (resourceItems.length >= 4) {
        resourceItems[0].querySelector('.resource-value').textContent = '$' + gameState.resources.budget.toFixed(1) + 'M';
        resourceItems[1].querySelector('.resource-value').textContent = gameState.resources.politicalCapital;
        resourceItems[2].querySelector('.resource-value').textContent = gameState.resources.personnel.toLocaleString();
        resourceItems[3].querySelector('.resource-value').textContent = gameState.resources.intelPoints;
    }

    const timeRemaining = document.getElementById('timeRemaining');
    if (timeRemaining) {
        timeRemaining.textContent = gameState.resources.timeMonths + ' months';
    }
}

function updateActionBar() {
    const actionsRemaining = document.getElementById('actionsRemaining');
    if (actionsRemaining) {
        actionsRemaining.textContent = gameState.actionsRemaining + ' / ' + gameState.maxActions;
    }

    const actionsHeader = document.getElementById('actionsRemainingHeader');
    if (actionsHeader) {
        actionsHeader.textContent = gameState.actionsRemaining + ' / ' + gameState.maxActions;
    }
}

function updateTurnCounter() {
    const turnNumber = document.querySelector('.turn-number');
    if (turnNumber) {
        turnNumber.textContent = gameState.turn + ' / ' + gameState.maxTurns;
    }
}

const takeActionConfig = {
    categories: {
        diplomatic: {
            label: 'Diplomatic',
            actions: [
                { value: 'summit', label: 'Convene Regional Summit' },
                { value: 'ceasefire', label: 'Broker Ceasefire Talks' },
                { value: 'envoy', label: 'Deploy AU Special Envoy' }
            ]
        },
        intelligence: {
            label: 'Intelligence',
            actions: [
                { value: 'recon', label: 'Deploy Reconnaissance Teams' },
                { value: 'humint', label: 'Expand HUMINT Network' },
                { value: 'fusion', label: 'Establish Joint Intel Cell' }
            ]
        },
        military: {
            label: 'Military',
            actions: [
                { value: 'deployment', label: 'Defensive Deployment' },
                { value: 'reaction', label: 'Rapid Reaction Force' },
                { value: 'training', label: 'Joint Training Mission' }
            ]
        },
        economic: {
            label: 'Economic',
            actions: [
                { value: 'stabilization', label: 'Stabilization Fund Release' },
                { value: 'sanctions', label: 'Targeted Sanctions Package' },
                { value: 'infrastructure', label: 'Infrastructure Grants' }
            ]
        }
    },
    objectives: [
        { value: 'stability', label: 'Stabilize Critical Zones' },
        { value: 'insurgency', label: 'Reduce Insurgency Pressure' },
        { value: 'civilians', label: 'Protect Civilian Populations' },
        { value: 'governance', label: 'Restore Local Governance' },
        { value: 'cooperation', label: 'Strengthen Regional Cooperation' }
    ]
};

const takeActionState = {
    selectedCountries: new Set(),
    selectedZones: new Set(),
    zoneMap: new Map()
};

function resetTakeActionState() {
    takeActionState.selectedCountries.clear();
    takeActionState.selectedZones.clear();
    takeActionState.zoneMap.clear();
}

function renderTakeActionCountries() {
    const list = document.getElementById('takeActionCountryList');
    if (!list) return;

    list.innerHTML = '';

    Object.entries(gameState.territories).forEach(([key, territory]) => {
        const item = document.createElement('label');
        item.className = 'take-action-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = key;
        checkbox.checked = takeActionState.selectedCountries.has(key);

        const flag = document.createElement('img');
        flag.className = 'take-action-flag';
        if (territory.flag) {
            flag.src = territory.flag;
            flag.alt = `${territory.name} flag`;
        } else {
            flag.alt = `${territory.name}`;
        }

        const labelWrap = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'take-action-item-title';
        title.textContent = territory.name;
        const subtitle = document.createElement('div');
        subtitle.className = 'take-action-item-subtitle';
        subtitle.textContent = territory.status;
        labelWrap.appendChild(title);
        labelWrap.appendChild(subtitle);

        checkbox.addEventListener('change', function () {
            if (this.checked) {
                takeActionState.selectedCountries.add(key);
            } else {
                takeActionState.selectedCountries.delete(key);
            }
            renderTakeActionZones();
        });

        item.appendChild(checkbox);
        if (territory.flag) {
            item.appendChild(flag);
        }
        item.appendChild(labelWrap);
        list.appendChild(item);
    });
}

function renderTakeActionZones() {
    const list = document.getElementById('takeActionZoneList');
    if (!list) return;

    list.innerHTML = '';
    takeActionState.zoneMap.clear();

    const selectedCountries = Array.from(takeActionState.selectedCountries);
    if (!selectedCountries.length) {
        list.innerHTML = '<div class="take-action-empty">Select countries to view zones.</div>';
        return;
    }

    selectedCountries.forEach(countryKey => {
        const zones = zonesData[countryKey] || [];
        const territory = gameState.territories[countryKey];

        zones.forEach(zone => {
            const zoneId = `${countryKey}:${zone.id}`;
            takeActionState.zoneMap.set(zoneId, `${zone.name} (${territory.name})`);

            const item = document.createElement('label');
            item.className = 'take-action-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = zoneId;
            checkbox.checked = takeActionState.selectedZones.has(zoneId);

            const flag = document.createElement('img');
            flag.className = 'take-action-flag';
            if (territory?.flag) {
                flag.src = territory.flag;
                flag.alt = `${territory.name} flag`;
            } else {
                flag.alt = territory?.name || countryKey;
            }

            const labelWrap = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'take-action-item-title';
            title.textContent = zone.name;
            const subtitle = document.createElement('div');
            subtitle.className = 'take-action-item-subtitle';
            subtitle.textContent = territory ? territory.name : countryKey;
            labelWrap.appendChild(title);
            labelWrap.appendChild(subtitle);

            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    takeActionState.selectedZones.add(zoneId);
                } else {
                    takeActionState.selectedZones.delete(zoneId);
                }
            });

            item.appendChild(checkbox);
            if (territory?.flag) {
                item.appendChild(flag);
            }
            item.appendChild(labelWrap);
            list.appendChild(item);
        });
    });

    const validZoneIds = new Set(takeActionState.zoneMap.keys());
    takeActionState.selectedZones.forEach(zoneId => {
        if (!validZoneIds.has(zoneId)) {
            takeActionState.selectedZones.delete(zoneId);
        }
    });

    if (!list.children.length) {
        list.innerHTML = '<div class="take-action-empty">No zones available.</div>';
    }
}

function updateTakeActionCategoryOptions() {
    const categorySelect = document.getElementById('takeActionCategory');
    if (!categorySelect) return;

    categorySelect.innerHTML = '';
    Object.entries(takeActionConfig.categories).forEach(([key, category]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = category.label;
        categorySelect.appendChild(option);
    });
}

function updateTakeActionActions() {
    const categorySelect = document.getElementById('takeActionCategory');
    const actionSelect = document.getElementById('takeActionAction');
    if (!categorySelect || !actionSelect) return;

    const categoryKey = categorySelect.value || Object.keys(takeActionConfig.categories)[0];
    const actions = takeActionConfig.categories[categoryKey]?.actions || [];

    actionSelect.innerHTML = '';
    actions.forEach(action => {
        const option = document.createElement('option');
        option.value = action.value;
        option.textContent = action.label;
        actionSelect.appendChild(option);
    });
}

function updateTakeActionObjectives() {
    const objectiveSelect = document.getElementById('takeActionObjective');
    if (!objectiveSelect) return;

    objectiveSelect.innerHTML = '';
    takeActionConfig.objectives.forEach(objective => {
        const option = document.createElement('option');
        option.value = objective.value;
        option.textContent = objective.label;
        objectiveSelect.appendChild(option);
    });
}

function updateTakeActionResourceSliders() {
    const budgetSlider = document.getElementById('takeActionBudgetSlider');
    const budgetValue = document.getElementById('takeActionBudgetValue');
    const budgetAvailable = document.getElementById('takeActionBudgetAvailable');

    const personnelSlider = document.getElementById('takeActionPersonnelSlider');
    const personnelValue = document.getElementById('takeActionPersonnelValue');
    const personnelAvailable = document.getElementById('takeActionPersonnelAvailable');

    const timeSlider = document.getElementById('takeActionTimeSlider');
    const timeValue = document.getElementById('takeActionTimeValue');
    const timeAvailable = document.getElementById('takeActionTimeAvailable');

    const budgetMax = Math.max(0, gameState.resources.budget);
    const personnelMax = Math.max(0, gameState.resources.personnel);
    const timeMax = Math.max(0, gameState.resources.timeMonths);

    if (budgetSlider && budgetValue && budgetAvailable) {
        budgetSlider.max = budgetMax;
        budgetSlider.value = Math.min(parseFloat(budgetSlider.value || 0), budgetMax);
        budgetValue.textContent = '$' + parseFloat(budgetSlider.value).toFixed(1) + 'M / $' + budgetMax.toFixed(1) + 'M';
        budgetAvailable.textContent = 'Available: $' + budgetMax.toFixed(1) + 'M';
        budgetSlider.oninput = function () {
            budgetValue.textContent = '$' + parseFloat(this.value).toFixed(1) + 'M / $' + budgetMax.toFixed(1) + 'M';
        };
    }

    if (personnelSlider && personnelValue && personnelAvailable) {
        personnelSlider.max = personnelMax;
        personnelSlider.value = Math.min(parseInt(personnelSlider.value || 0), personnelMax);
        personnelValue.textContent = parseInt(personnelSlider.value).toLocaleString() + ' / ' + personnelMax.toLocaleString();
        personnelAvailable.textContent = 'Available: ' + personnelMax.toLocaleString();
        personnelSlider.oninput = function () {
            personnelValue.textContent = parseInt(this.value).toLocaleString() + ' / ' + personnelMax.toLocaleString();
        };
    }

    if (timeSlider && timeValue && timeAvailable) {
        timeSlider.max = timeMax;
        timeSlider.value = Math.min(parseInt(timeSlider.value || 0), timeMax);
        timeValue.textContent = parseInt(timeSlider.value) + ' / ' + timeMax;
        timeAvailable.textContent = 'Available: ' + timeMax + ' months';
        timeSlider.oninput = function () {
            timeValue.textContent = parseInt(this.value) + ' / ' + timeMax;
        };
    }
}

function getTakeActionAllocation() {
    const budgetSlider = document.getElementById('takeActionBudgetSlider');
    const personnelSlider = document.getElementById('takeActionPersonnelSlider');
    const timeSlider = document.getElementById('takeActionTimeSlider');

    return {
        budget: budgetSlider ? parseFloat(budgetSlider.value || 0) : 0,
        personnel: personnelSlider ? parseInt(personnelSlider.value || 0) : 0,
        time: timeSlider ? parseInt(timeSlider.value || 0) : 0
    };
}

function getTakeActionSelection(requireValidation = true) {
    const categorySelect = document.getElementById('takeActionCategory');
    const actionSelect = document.getElementById('takeActionAction');
    const objectiveSelect = document.getElementById('takeActionObjective');

    const selectedCountries = Array.from(takeActionState.selectedCountries);
    const selectedZones = Array.from(takeActionState.selectedZones);
    const allocation = getTakeActionAllocation();

    if (requireValidation) {
        if (!selectedCountries.length) {
            showNotification('Select Target Countries', 'Choose at least one country to continue.', true);
            return null;
        }
        if (!selectedZones.length) {
            showNotification('Select Target Zones', 'Choose at least one zone of interest to continue.', true);
            return null;
        }
        if (!categorySelect?.value || !actionSelect?.value || !objectiveSelect?.value) {
            showNotification('Complete Action Setup', 'Select a category, action, and objective.', true);
            return null;
        }
    }

    const categoryKey = categorySelect?.value || '';
    const actionKey = actionSelect?.value || '';
    const objectiveKey = objectiveSelect?.value || '';

    const categoryLabel = takeActionConfig.categories[categoryKey]?.label || categoryKey;
    const actionLabel = takeActionConfig.categories[categoryKey]?.actions.find(action => action.value === actionKey)?.label || actionKey;
    const objectiveLabel = takeActionConfig.objectives.find(obj => obj.value === objectiveKey)?.label || objectiveKey;

    const countryLabels = selectedCountries.map(key => gameState.territories[key]?.name || key);
    const zoneLabels = selectedZones.map(id => takeActionState.zoneMap.get(id) || id);

    return {
        categoryKey,
        categoryLabel,
        actionKey,
        actionLabel,
        objectiveKey,
        objectiveLabel,
        countries: selectedCountries,
        countryLabels,
        zones: selectedZones,
        zoneLabels,
        allocation
    };
}

function buildTakeActionSummary(data) {
    const countryChips = data.countryLabels.map(label => `<span class="take-action-chip">${label}</span>`).join('');
    const zoneChips = data.zoneLabels.map(label => `<span class="take-action-chip">${label}</span>`).join('');

    return `
        <div class="take-action-summary-title">${data.actionLabel}</div>
        <div class="take-action-summary-row"><span>Category</span><strong>${data.categoryLabel}</strong></div>
        <div class="take-action-summary-row"><span>Objective</span><strong>${data.objectiveLabel}</strong></div>
        <div class="take-action-summary-row"><span>Countries</span></div>
        <div class="take-action-chips">${countryChips}</div>
        <div class="take-action-summary-row"><span>Zones</span></div>
        <div class="take-action-chips">${zoneChips}</div>
        <div class="take-action-summary-row"><span>Budget</span><strong>$${data.allocation.budget.toFixed(1)}M</strong></div>
        <div class="take-action-summary-row"><span>Personnel</span><strong>${data.allocation.personnel.toLocaleString()}</strong></div>
        <div class="take-action-summary-row"><span>Time</span><strong>${data.allocation.time} months</strong></div>
    `;
}

function openTakeActionModal() {
    resetTakeActionState();
    updateTakeActionCategoryOptions();
    updateTakeActionActions();
    updateTakeActionObjectives();
    renderTakeActionCountries();
    renderTakeActionZones();
    const budgetSlider = document.getElementById('takeActionBudgetSlider');
    const personnelSlider = document.getElementById('takeActionPersonnelSlider');
    const timeSlider = document.getElementById('takeActionTimeSlider');
    if (budgetSlider) budgetSlider.value = 0;
    if (personnelSlider) personnelSlider.value = 0;
    if (timeSlider) timeSlider.value = 0;
    updateTakeActionResourceSliders();
    openModal('takeActionModal');
}

function reviewTakeAction() {
    if (gameState.actionsRemaining <= 0) {
        showNotification('No Actions Remaining', 'End your turn to take additional actions.', true);
        return;
    }

    const data = getTakeActionSelection(true);
    if (!data) return;

    const summaryEl = document.getElementById('takeActionSummary');
    if (summaryEl) {
        summaryEl.innerHTML = buildTakeActionSummary(data);
    }

    openModal('takeActionConfirmModal');
}

function confirmTakeAction() {
    const data = getTakeActionSelection(true);
    if (!data) return;

    if (gameState.actionsRemaining <= 0) {
        showNotification('No Actions Remaining', 'End your turn to take additional actions.', true);
        closeModal('takeActionConfirmModal');
        return;
    }

    gameState.actionsRemaining--;
    gameState.resources.budget = clamp(gameState.resources.budget - data.allocation.budget, 0, 9999);
    gameState.resources.personnel = clamp(gameState.resources.personnel - data.allocation.personnel, 0, 999999);
    gameState.resources.timeMonths = clamp(gameState.resources.timeMonths - data.allocation.time, 0, 999);

    updateActionBar();
    updateResources();

    recordStatusEntry({
        category: 'Action',
        title: data.actionLabel,
        summary: `${data.categoryLabel} action focused on ${data.objectiveLabel} in ${data.countryLabels.join(', ')}.`,
        effects: [
            { label: `Budget -$${data.allocation.budget.toFixed(1)}M`, type: 'negative' },
            { label: `Personnel -${data.allocation.personnel.toLocaleString()}`, type: 'negative' },
            { label: `Time -${data.allocation.time} months`, type: 'negative' }
        ],
        turn: gameState.turn
    });

    showNotification('Action Confirmed', `${data.actionLabel} initiated.`, false);

    closeModal('takeActionConfirmModal');
    closeModal('takeActionModal');
}

const statusReportTemplates = {
    military: {
        title: 'Military Deployment',
        summary: 'AU peacekeepers deployed to northern Mali.',
        effects: [
            { label: 'Stability +5', type: 'positive' },
            { label: 'Insurgency -8', type: 'positive' },
            { label: 'Civilian Support +8', type: 'positive' },
            { label: 'Political Capital -12', type: 'negative' },
            { label: 'Budget -$8.5M', type: 'negative' }
        ]
    },
    diplomatic: {
        title: 'Diplomatic Negotiation',
        summary: 'Ceasefire negotiations initiated through ECOWAS.',
        effects: [
            { label: 'Political Capital +15', type: 'positive' },
            { label: 'Global Legitimacy +8', type: 'positive' },
            { label: 'Regional Synergy +5', type: 'positive' },
            { label: 'Insurgency -3', type: 'positive' }
        ]
    },
    humanitarian: {
        title: 'Humanitarian Response',
        summary: 'Civilian evacuation corridors established.',
        effects: [
            { label: 'Civilian Support +15', type: 'positive' },
            { label: 'Global Legitimacy +5', type: 'positive' },
            { label: 'Stability +3', type: 'positive' },
            { label: 'Budget -$12.0M', type: 'negative' }
        ]
    }
};

function recordStatusEntry(entry) {
    const normalized = {
        turn: entry.turn || gameState.turn,
        category: entry.category || 'Action',
        title: entry.title || 'Action Recorded',
        summary: entry.summary || '',
        effects: Array.isArray(entry.effects) ? entry.effects : [],
        time: entry.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    gameState.actionsTaken.push(normalized);
    updateStatusReport();
}

function renderStatusReport() {
    const container = document.getElementById('statusReportContent');
    if (!container) return;

    const entries = gameState.actionsTaken.slice().reverse();

    if (!entries.length) {
        container.innerHTML = `
            <div class="character-timeline-item status-report-empty">
                <div class="character-timeline-year">---</div>
                <div class="character-timeline-title">No outcomes logged yet</div>
                <div class="character-timeline-description">Take actions, engage actors, or end a turn to generate outcomes.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    entries.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'character-timeline-item';

        const category = (entry.category || 'Action').toLowerCase();
        const entryTypeMap = { engagement: 'ENG', turn: 'TRN', action: 'ACT', outcome: 'OUT' };
        const entryType = entryTypeMap[category] || category.slice(0, 3).toUpperCase();
        const turnLabel = `T${entry.turn}`;
        const effectsHtml = (entry.effects || []).map(effect => {
            const effectType = effect.type ? effect.type : 'neutral';
            return `<span class="status-report-effect ${effectType}">${effect.label}</span>`;
        }).join('');

        item.innerHTML = `
            <div class="character-timeline-year">${turnLabel} ${entryType}</div>
            <div class="character-timeline-title">${entry.title}</div>
            <div class="character-timeline-description">
                ${entry.summary}
                ${effectsHtml ? `<div class="status-report-results">${effectsHtml}</div>` : ''}
            </div>
        `;

        container.appendChild(item);
    });
}

function updateStatusReport() {
    const overlay = document.getElementById('statusReportOverlay');
    if (overlay && overlay.classList.contains('active')) {
        renderStatusReport();
    }
}

function seedTurnOneOutcomes() {
    if (gameState.seededTurnOutcomes) return;
    gameState.seededTurnOutcomes = true;

    const seedTurn = 1;
    const entries = [
        {
            category: 'Action',
            title: 'Rapid Reaction Deployment - Djibo',
            summary: 'AU rapid reaction unit inserted to break siege lines and secure a relief corridor.',
            effects: [
                { label: 'Stability +4', type: 'positive' },
                { label: 'Insurgency -6', type: 'positive' },
                { label: 'Civilian Support +3', type: 'positive' },
                { label: 'Political Capital -8', type: 'negative' },
                { label: 'Budget -$7.5M', type: 'negative' },
                { label: 'Actor: JNIM sentiment -6', type: 'negative' },
                { label: 'Actor: Burkina Junta +2', type: 'positive' },
                { label: 'Zone: Djibo insurgency -10', type: 'positive' },
                { label: 'Intel: Militia activity -1', type: 'positive' }
            ]
        },
        {
            category: 'Action',
            title: 'Humanitarian Airlift - Djibo',
            summary: 'Emergency airlift delivers food, medical kits, and civilian evacuation support.',
            effects: [
                { label: 'Civilian Support +8', type: 'positive' },
                { label: 'Global Legitimacy +4', type: 'positive' },
                { label: 'Budget -$5.0M', type: 'negative' },
                { label: 'Personnel -60', type: 'negative' },
                { label: 'Time -1 month', type: 'negative' },
                { label: 'Intel Points +2', type: 'positive' },
                { label: 'Intel: IDP camps -1', type: 'positive' },
                { label: 'Zone: Djibo access stabilized', type: 'neutral' }
            ]
        },
        {
            category: 'Action',
            title: 'Diplomatic Track - Ouahigouya',
            summary: 'Back-channel talks reduce escalation and unlock local mediation efforts.',
            effects: [
                { label: 'Political Capital +10', type: 'positive' },
                { label: 'Regional Synergy +4', type: 'positive' },
                { label: 'Stability +2', type: 'positive' },
                { label: 'Insurgency -2', type: 'positive' },
                { label: 'Budget -$2.0M', type: 'negative' },
                { label: 'Time -1 month', type: 'negative' },
                { label: 'Actor: Amina Ouedraogo +6', type: 'positive' },
                { label: 'Zone: Ouahigouya insurgency -4', type: 'positive' },
                { label: 'Intel: Illicit activity -1', type: 'positive' }
            ]
        },
        {
            category: 'Turn',
            title: 'Turn 1 Transition',
            summary: 'Opposition adapts as momentum shifts; threats reconfigure across the region.',
            effects: [
                { label: 'Stability +1', type: 'positive' },
                { label: 'Insurgency +1', type: 'negative' },
                { label: 'Civilian Support -1', type: 'negative' },
                { label: 'Intel: Militia activity +1', type: 'negative' }
            ]
        }
    ];

    entries.forEach(entry => recordStatusEntry({ ...entry, turn: seedTurn }));

    const metricDeltas = {
        stability: 7,
        insurgency: -7,
        civilianSupport: 10,
        globalLegitimacy: 4,
        regionalSynergy: 4
    };
    Object.keys(metricDeltas).forEach(key => {
        const current = Number(gameState.metrics[key] || 0);
        gameState.metrics[key] = clamp(current + metricDeltas[key], 0, 100);
    });

    const resourceDeltas = {
        budget: -14.5,
        politicalCapital: 2,
        personnel: -180,
        intelPoints: 2,
        timeMonths: -4
    };
    Object.keys(resourceDeltas).forEach(key => {
        const current = Number(gameState.resources[key] || 0);
        const next = current + resourceDeltas[key];
        gameState.resources[key] = key === 'budget' ? Number(next.toFixed(1)) : Math.max(0, Math.round(next));
    });

    const burkina = gameState.territories.burkinaFaso;
    if (burkina) {
        burkina.stability = clamp((burkina.stability || 0) + 3, 0, 100);
        burkina.insurgency = clamp((burkina.insurgency || 0) - 5, 0, 100);
    }

    const djibo = zonesData.burkinaFaso?.find(zone => zone.id === 'djibo');
    if (djibo) djibo.insurgency = clamp((djibo.insurgency || 0) - 10, 0, 100);
    const ouahigouya = zonesData.burkinaFaso?.find(zone => zone.id === 'ouahigouya');
    if (ouahigouya) ouahigouya.insurgency = clamp((ouahigouya.insurgency || 0) - 4, 0, 100);

    // Advance to the next turn to reflect a completed turn of actions
    gameState.turn = 2;
    gameState.actionsRemaining = gameState.maxActions;

    updateMetrics();
    updateResources();
    updateTurnCounter();
    updateActionBar();
}



// ===== AI MODEL HELPERS =====
const aiActionProfiles = {
    military: {
        oppositionDelta: 3,
        intelConfidenceDelta: 1,
        actorDeltas: { 'JNIM Leadership': -4, 'AU Commissioner': 2 },
        intelDelta: { militia: -1, idp: 0, illicit: 0 },
        risks: ['Insurgent cells scatter into rural areas']
    },
    diplomatic: {
        oppositionDelta: -2,
        intelConfidenceDelta: 1,
        actorDeltas: { 'ECOWAS Commission': 3, 'AU Commissioner': 2 },
        intelDelta: { militia: 0, idp: 0, illicit: -1 },
        risks: ['Hardliners may resist concessions']
    },
    humanitarian: {
        oppositionDelta: -1,
        intelConfidenceDelta: 2,
        actorDeltas: { 'Local Civil Society': 4 },
        intelDelta: { militia: 0, idp: -1, illicit: 0 },
        risks: ['Aid corridors remain contested']
    }
};

const territoryLocalActors = {
    mali: 'goita',
    burkinaFaso: 'burkinaJunta',
    niger: 'nigerJunta',
    chad: 'chadTransitional',
    mauritania: 'mauritaniaIntel'
};

function ensureAIState() {
    if (!gameState.ai) {
        gameState.ai = { oppositionPressure: 50, intelConfidence: 50, actorSentiments: {} };
    }
    if (!gameState.ai.actorSentiments) {
        gameState.ai.actorSentiments = {};
    }
}

function resolveActorKeyFromName(name) {
    if (!name) return null;
    const normalized = name.toLowerCase();

    for (const [key, actor] of Object.entries(actorData || {})) {
        if (actor?.name && actor.name.toLowerCase() === normalized) return key;
    }

    if (normalized.includes('goita')) return 'goita';
    if (normalized.includes('au commissioner') || normalized.includes('african union')) return 'auCommissioner';
    if (normalized.includes('jnim')) return 'jnim';
    if (normalized.includes('ecowas')) return 'ecowas';
    if (normalized.includes('tuareg')) return 'tuareg';
    if (normalized.includes('wagner')) return 'wagner';
    if (normalized.includes('ousmane')) return 'burkinaJunta';
    if (normalized.includes('amina')) return 'burkinaCivil';
    if (normalized.includes('abdou karim')) return 'nigerJunta';
    if (normalized.includes('salif')) return 'nigerHumanitarian';
    if (normalized.includes('halima')) return 'chadTransitional';
    if (normalized.includes('lamine')) return 'mauritaniaIntel';

    return null;
}

function mergeDeltaMaps(base = {}, extra = {}) {
    const merged = { ...base };
    Object.entries(extra || {}).forEach(([key, value]) => {
        if (typeof value !== 'number') return;
        merged[key] = (merged[key] || 0) + value;
    });
    return merged;
}

function applyMetricsDelta(deltaMap) {
    Object.entries(deltaMap || {}).forEach(([key, value]) => {
        if (typeof value !== 'number') return;
        gameState.metrics[key] = clamp((gameState.metrics[key] || 0) + value, 0, 100);
    });
}

function applyActorSentimentDeltaByKey(actorKey, delta) {
    if (!actorKey || typeof delta !== 'number') return null;
    ensureAIState();

    const current = Number(gameState.ai.actorSentiments[actorKey] ?? 50);
    const next = clamp(current + delta, 0, 100);
    gameState.ai.actorSentiments[actorKey] = next;

    const actorName = actorData?.[actorKey]?.name || actorKey;
    const signed = formatSignedNumber(delta);
    return { label: `Actor: ${actorName} sentiment ${signed.text}`, type: signed.className };
}

function applyActorSentimentDeltas(actorDeltas) {
    const effects = [];
    Object.entries(actorDeltas || {}).forEach(([name, delta]) => {
        if (typeof delta !== 'number' || delta === 0) return;
        const actorKey = resolveActorKeyFromName(name);
        const actorName = actorKey ? (actorData?.[actorKey]?.name || name) : name;
        if (actorKey) {
            applyActorSentimentDeltaByKey(actorKey, delta);
        }
        const signed = formatSignedNumber(delta);
        effects.push({ label: `Actor: ${actorName} sentiment ${signed.text}`, type: signed.className });
    });
    return effects;
}

function applyIntelDelta(intelDelta) {
    const effects = [];
    if (!intelDelta) return effects;

    const labels = { militia: 'Militia activity', idp: 'IDP camps', illicit: 'Illicit activity' };
    let net = 0;

    Object.entries(intelDelta).forEach(([key, value]) => {
        if (typeof value !== 'number' || value === 0) return;
        net += value;
        const signed = formatSignedNumber(value);
        effects.push({ label: `Intel: ${labels[key] || key} ${signed.text}`, type: signed.className });
    });

    if (net !== 0) {
        ensureAIState();
        const confidenceDelta = net < 0 ? 2 : -2;
        gameState.ai.intelConfidence = clamp(gameState.ai.intelConfidence + confidenceDelta, 0, 100);
        const signed = formatSignedNumber(confidenceDelta);
        effects.push({ label: `Intel Confidence ${signed.text}`, type: signed.className });

        const pointsDelta = net < 0 ? 1 : -1;
        gameState.resources.intelPoints = clamp((gameState.resources.intelPoints || 0) + pointsDelta, 0, 99);
    }

    return effects;
}

function buildActionReportEffects(reportTemplate, mergedConfig, territory, zone, aiResult, actorEffects, intelEffects) {
    const effects = [...(reportTemplate?.effects || [])];
    const combined = [
        ...(actorEffects || []),
        ...(intelEffects || []),
        ...(aiResult?.effects || [])
    ];

    if (mergedConfig?.territoryDelta && territory) {
        if (mergedConfig.territoryDelta.stability) {
            const signed = formatSignedNumber(mergedConfig.territoryDelta.stability);
            combined.push({ label: `Territory: ${territory.name} stability ${signed.text}`, type: signed.className });
        }
        if (mergedConfig.territoryDelta.insurgency) {
            const signed = formatSignedNumber(mergedConfig.territoryDelta.insurgency);
            combined.push({ label: `Territory: ${territory.name} insurgency ${signed.text}`, type: signed.className });
        }
    }

    if (mergedConfig?.zoneDelta && zone && mergedConfig.zoneDelta.insurgency) {
        const signed = formatSignedNumber(mergedConfig.zoneDelta.insurgency);
        combined.push({ label: `Zone: ${zone.name} insurgency ${signed.text}`, type: signed.className });
    }

    return effects.concat(combined).slice(0, 14);
}

function mergeOutcomeConfig(baseConfig, aiResult) {
    if (!aiResult) return { ...baseConfig };

    return {
        ...baseConfig,
        actorDeltas: mergeDeltaMaps(baseConfig.actorDeltas, aiResult.actorDeltas),
        intelDelta: mergeDeltaMaps(baseConfig.intelDelta, aiResult.intelDelta),
        territoryDelta: mergeDeltaMaps(baseConfig.territoryDelta, aiResult.territoryDelta),
        zoneDelta: mergeDeltaMaps(baseConfig.zoneDelta, aiResult.zoneDelta),
        metricsDelta: mergeDeltaMaps(baseConfig.metricsDelta, aiResult.metricsDelta),
        support: {
            budget: (baseConfig.support?.budget || 0) + (aiResult.support?.budget || 0),
            personnel: (baseConfig.support?.personnel || 0) + (aiResult.support?.personnel || 0)
        },
        risks: [...(baseConfig.risks || []), ...(aiResult.risks || [])]
    };
}

function runActionAIModel(decisionType, territoryKey, zone) {
    ensureAIState();

    const profile = aiActionProfiles[decisionType] || aiActionProfiles.military;
    const actorDeltas = { ...profile.actorDeltas };
    const localActorKey = territoryLocalActors[territoryKey];

    if (localActorKey && actorData?.[localActorKey]?.name) {
        const localName = actorData[localActorKey].name;
        const localBoost = decisionType === 'diplomatic' ? 3 : 2;
        actorDeltas[localName] = (actorDeltas[localName] || 0) + localBoost;
    }

    gameState.ai.oppositionPressure = clamp(gameState.ai.oppositionPressure + profile.oppositionDelta, 0, 100);
    gameState.ai.intelConfidence = clamp(gameState.ai.intelConfidence + profile.intelConfidenceDelta, 0, 100);

    const effects = [];
    const pressureSigned = formatSignedNumber(profile.oppositionDelta);
    effects.push({ label: `Opposition Pressure ${pressureSigned.text}`, type: pressureSigned.className });

    const intelSigned = formatSignedNumber(profile.intelConfidenceDelta);
    effects.push({ label: `Intel Confidence ${intelSigned.text}`, type: intelSigned.className });

    if (zone) {
        const zoneNote = decisionType === 'military'
            ? 'situation stabilized'
            : decisionType === 'diplomatic'
                ? 'situation de-escalated'
                : 'access improved';
        effects.push({ label: `Zone: ${zone.name} ${zoneNote}`, type: 'positive' });
    }

    return {
        actorDeltas,
        intelDelta: profile.intelDelta,
        risks: profile.risks,
        effects
    };
}

function selectHotspotZone() {
    const allZones = Object.values(zonesData || {}).flat();
    if (!allZones.length) return null;
    return allZones.reduce((hotspot, zone) => {
        const current = hotspot?.insurgency || 0;
        const candidate = zone?.insurgency || 0;
        return candidate > current ? zone : hotspot;
    }, allZones[0]);
}

function runTurnAIModel() {
    ensureAIState();
    const aiState = gameState.ai;

    const pressureBias = Math.round((aiState.oppositionPressure - 50) / 25);
    const intelBias = aiState.intelConfidence >= 65 ? 1 : aiState.intelConfidence <= 35 ? -1 : 0;
    const noise = Math.floor(Math.random() * 3) - 1;

    const insurgencyDelta = clamp(pressureBias + noise - intelBias, -3, 4);
    const stabilityDelta = clamp(-insurgencyDelta + (aiState.intelConfidence > 60 ? 1 : 0) + (Math.random() > 0.7 ? 1 : 0), -3, 3);
    const civilianDelta = clamp((aiState.intelConfidence > 55 ? 1 : 0) - (aiState.oppositionPressure > 60 ? 1 : 0), -3, 3);

    gameState.metrics.insurgency = clamp(gameState.metrics.insurgency + insurgencyDelta, 0, 100);
    gameState.metrics.stability = clamp(gameState.metrics.stability + stabilityDelta, 0, 100);
    gameState.metrics.civilianSupport = clamp(gameState.metrics.civilianSupport + civilianDelta, 0, 100);

    const pressureDelta = clamp(Math.round(insurgencyDelta * 1.5) - (stabilityDelta > 0 ? 1 : 0), -4, 4);
    const intelDelta = clamp((stabilityDelta > 0 ? 1 : -1) + (Math.random() > 0.7 ? 1 : 0), -2, 2);

    aiState.oppositionPressure = clamp(aiState.oppositionPressure + pressureDelta, 0, 100);
    aiState.intelConfidence = clamp(aiState.intelConfidence + intelDelta, 0, 100);

    if (intelDelta !== 0) {
        gameState.resources.intelPoints = clamp((gameState.resources.intelPoints || 0) + (intelDelta > 0 ? 1 : -1), 0, 99);
    }

    const effects = [];
    const pressureSigned = formatSignedNumber(pressureDelta);
    effects.push({ label: `Opposition Pressure ${pressureSigned.text}`, type: pressureSigned.className });

    const intelSigned = formatSignedNumber(intelDelta);
    effects.push({ label: `Intel Confidence ${intelSigned.text}`, type: intelSigned.className });

    if (insurgencyDelta > 0) {
        const jnimEffect = applyActorSentimentDeltaByKey('jnim', 2);
        const auEffect = applyActorSentimentDeltaByKey('auCommissioner', -1);
        if (jnimEffect) effects.push(jnimEffect);
        if (auEffect) effects.push(auEffect);
    } else if (insurgencyDelta < 0) {
        const jnimEffect = applyActorSentimentDeltaByKey('jnim', -2);
        const auEffect = applyActorSentimentDeltaByKey('auCommissioner', 1);
        if (jnimEffect) effects.push(jnimEffect);
        if (auEffect) effects.push(auEffect);
    }

    const hotspot = selectHotspotZone();
    if (hotspot) {
        const zoneDelta = insurgencyDelta === 0 ? 0 : Math.sign(insurgencyDelta);
        if (zoneDelta !== 0) {
            hotspot.insurgency = clamp((hotspot.insurgency || 0) + zoneDelta, 0, 100);
            const signed = formatSignedNumber(zoneDelta);
            effects.push({ label: `Zone: ${hotspot.name} insurgency ${signed.text}`, type: signed.className });
        }
    }

    return {
        effects,
        metricDeltas: {
            stability: stabilityDelta,
            insurgency: insurgencyDelta,
            civilianSupport: civilianDelta
        }
    };
}
// ===== SCENARIO DECISION FUNCTIONS =====
let pendingActionType = null;

function openActionDetailModal(actionType) {
    pendingActionType = actionType;
    const modal = document.getElementById('actionDetailModal');

    // Elements
    const titleEl = document.getElementById('detailActionTitle');
    const descEl = document.getElementById('detailActionDesc');
    const typeTagEl = document.getElementById('detailActionType');
    const iconEl = document.getElementById('detailActionIcon');
    const costEl = document.getElementById('detailCost');
    const focusSelect = document.getElementById('focusAreaSelect');

    // Sliders & Values
    const budgetSlider = document.getElementById('budgetSlider');
    const personnelSlider = document.getElementById('personnelSlider');
    const politicalSlider = document.getElementById('politicalSlider');
    const budgetVal = document.getElementById('budgetValue');
    const personnelVal = document.getElementById('personnelValue');
    const politicalVal = document.getElementById('politicalValue');
    const regionVal = document.getElementById('targetRegionValue');

    if (regionVal) regionVal.textContent = "Gao, Mali"; // Default for this scenario

    // Clear previous type classes
    typeTagEl.classList.remove('military', 'diplomatic', 'humanitarian');

    // Dynamic Options Data
    let focusOptions = [];
    let initialBudget = 5.0;
    let initialPersonnel = 1000;
    let initialPolitical = 5;

    switch (actionType) {
        case 'military':
            titleEl.textContent = 'Defensive Deployment';
            descEl.textContent = 'Deploy a reinforced brigade of AU peacekeepers (3,500 troops) to establish a buffer zone around Goundam and secure key infrastructure.';
            typeTagEl.textContent = 'Military';
            typeTagEl.classList.add('military');
            iconEl.textContent = '⚔️';
            costEl.textContent = '$8.5M | 12 PC | 2500 Pers';

            initialBudget = 8.5;
            initialPersonnel = 2500;
            initialPolitical = 12;

            focusOptions = [
                { val: 'defensive', text: 'Perimeter Defense' },
                { val: 'counter_terror', text: 'Counter-Terrorism Ops' },
                { val: 'logistics', text: 'Logistics & Supply Lines' }
            ];
            break;

        case 'diplomatic':
            titleEl.textContent = 'Regional Mediation';
            descEl.textContent = 'Convene an emergency ECOWAS summit to negotiate a temporary ceasefire and open channels for political dialogue.';
            typeTagEl.textContent = 'Diplomatic';
            typeTagEl.classList.add('diplomatic');
            iconEl.textContent = '🤝';
            costEl.textContent = '$1.2M | 5 PC | 50 Pers';

            initialBudget = 1.2;
            initialPersonnel = 50;
            initialPolitical = 5;

            focusOptions = [
                { val: 'ceasefire', text: 'Immediate Ceasefire' },
                { val: 'coalition', text: 'Coalition Building' },
                { val: 'sanctions', text: 'Sanctions & Pressure' }
            ];
            break;

        case 'humanitarian':
            titleEl.textContent = 'Evacuation Corridor';
            descEl.textContent = 'Establish distinct UN-protected corridors to allow 50,000 civilians to flee the combat zone safely.';
            typeTagEl.textContent = 'Humanitarian';
            typeTagEl.classList.add('humanitarian');
            iconEl.textContent = '🚑';
            costEl.textContent = '$12.0M | 3 PC | 1200 Pers';

            initialBudget = 12.0;
            initialPersonnel = 1200;
            initialPolitical = 3;

            focusOptions = [
                { val: 'food', text: 'Food & Water Security' },
                { val: 'medical', text: 'Emergency Medical Care' },
                { val: 'evac', text: 'Civilian Evacuation' }
            ];
            break;
    }

    // Populate Focus Select
    if (focusSelect) {
        focusSelect.innerHTML = '';
        focusOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.val;
            option.textContent = opt.text;
            focusSelect.appendChild(option);
        });
    }

    // Initialize Sliders
    if (budgetSlider) {
        budgetSlider.value = initialBudget;
        budgetVal.textContent = '$' + initialBudget + 'M';
        budgetSlider.oninput = function () {
            budgetVal.textContent = '$' + this.value + 'M';
            costEl.textContent = '$' + this.value + 'M | ' + politicalSlider.value + ' PC | ' + personnelSlider.value + ' Pers';
        }
    }
    if (personnelSlider) {
        personnelSlider.value = initialPersonnel;
        personnelVal.textContent = initialPersonnel.toLocaleString();
        personnelSlider.oninput = function () {
            personnelVal.textContent = parseInt(this.value).toLocaleString();
            costEl.textContent = '$' + budgetSlider.value + 'M | ' + politicalSlider.value + ' PC | ' + this.value + ' Pers';
        }
    }
    if (politicalSlider) {
        politicalSlider.value = initialPolitical;
        politicalVal.textContent = initialPolitical + ' pts';
        politicalSlider.oninput = function () {
            politicalVal.textContent = this.value + ' pts';
            costEl.textContent = '$' + budgetSlider.value + 'M | ' + this.value + ' PC | ' + personnelSlider.value + ' Pers';
        }
    }

    openModal('actionDetailModal');
}

function confirmScenarioDecision() {
    closeModal('actionDetailModal');
    if (pendingActionType) {
        handleScenarioDecision(pendingActionType);
        pendingActionType = null;
    }
}

// Add initialization listener for specific button
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmActionBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmScenarioDecision);
    }

    // Slider interactivity for prototype feel
    // (Removed intensitySlider logic as it is replaced by granular resource sliders initialized in openActionDetailModal)

    // Scenario Tab Logic
    // Scenario Tab Logic - Removed (Tabs simplified)
});
function handleScenarioDecision(decisionType) {
    if (gameState.actionsRemaining <= 0) {
        showNotification('No Actions Remaining', 'You must end your turn before taking more actions.', true);
        return;
    }

    const actionOutcomeConfigs = {
        military: {
            title: 'Rapid Reaction Deployment',
            outcome: 'Contained',
            pill: 'success',
            actorDeltas: {
                'AU Commissioner': 4,
                'JNIM Leadership': -8,
                'Local Civil Society': 2,
                'ECOWAS Commission': -1
            },
            territoryDelta: { stability: 4, insurgency: -6, auPresence: 3 },
            zoneDelta: { insurgency: -8 },
            intelDelta: { militia: -1, idp: 0, illicit: 0 },
            support: { budget: 0, personnel: 0 },
            risks: ['Retaliation likely in neighboring zones', 'Aid corridors under strain']
        },
        diplomatic: {
            title: 'Diplomatic Negotiation',
            outcome: 'De-escalation',
            pill: 'success',
            actorDeltas: {
                'AU Commissioner': 6,
                'ECOWAS Commission': 8,
                'JNIM Leadership': -2,
                'Local Civil Society': 3
            },
            territoryDelta: { stability: 3, insurgency: -2, auPresence: 1 },
            zoneDelta: { insurgency: -2 },
            intelDelta: { militia: 0, idp: -1, illicit: -1 },
            support: { budget: 3.0, personnel: 200 },
            risks: ['Ceasefire compliance uncertain', 'Hardliners may stall talks']
        },
        humanitarian: {
            title: 'Humanitarian Response',
            outcome: 'Relief Delivered',
            pill: 'success',
            actorDeltas: {
                'AU Commissioner': 3,
                'Local Civil Society': 6,
                'JNIM Leadership': -1,
                'Humanitarian Cluster': 4
            },
            territoryDelta: { stability: 2, insurgency: -1, auPresence: 1 },
            zoneDelta: { insurgency: -1 },
            intelDelta: { militia: 0, idp: -2, illicit: 0 },
            support: { budget: 2.0, personnel: 150 },
            risks: ['Aid convoys vulnerable', 'Displacement pressure shifts']
        }
    };

    gameState.actionsRemaining--;
    updateActionBar();

    // Show loading briefly
    const scenarioPanel = document.querySelector('.scenario-panel');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay active';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    scenarioPanel.style.position = 'relative';
    scenarioPanel.appendChild(loadingOverlay);

    setTimeout(() => {
        loadingOverlay.remove();

        // Apply consequences based on decision
        const config = actionOutcomeConfigs[decisionType] || actionOutcomeConfigs.military;
        const territoryKey = gameState.currentTerritory || 'mali';
        const territory = gameState.territories[territoryKey];
        const zone = zonesData[territoryKey]?.[0] || null;
        const aiResult = runActionAIModel(decisionType, territoryKey, zone);
        const mergedConfig = mergeOutcomeConfig(config, aiResult);
        const beforeState = {
            metrics: { ...gameState.metrics },
            resources: { ...gameState.resources },
            territory: territory ? { ...territory } : null,
            zone: zone ? { ...zone } : null
        };

        switch (decisionType) {
            case 'military':
                gameState.metrics.stability += 5;
                gameState.metrics.insurgency -= 8;
                gameState.resources.politicalCapital -= 12;
                gameState.metrics.civilianSupport += 8;
                gameState.resources.budget -= 8.5;

                document.getElementById('outcomeDecision').textContent = 'Military Deployment';
                showNotification('Decision Executed', 'AU peacekeepers deployed to northern Mali.', false);
                break;

            case 'diplomatic':
                gameState.resources.politicalCapital += 15;
                gameState.metrics.globalLegitimacy += 8;
                gameState.metrics.regionalSynergy += 5;
                gameState.metrics.insurgency -= 3;

                document.getElementById('outcomeDecision').textContent = 'Diplomatic Negotiation';
                showNotification('Decision Executed', 'Ceasefire negotiations initiated through ECOWAS.', false);
                break;

            case 'humanitarian':
                gameState.metrics.civilianSupport += 15;
                gameState.metrics.globalLegitimacy += 5;
                gameState.resources.budget -= 12.0;
                gameState.metrics.stability += 3;

                document.getElementById('outcomeDecision').textContent = 'Humanitarian Response';
                showNotification('Decision Executed', 'Civilian evacuation corridors established.', false);
                break;
        }

        if (mergedConfig.support?.budget) {
            gameState.resources.budget += mergedConfig.support.budget;
        }
        if (mergedConfig.support?.personnel) {
            gameState.resources.personnel += mergedConfig.support.personnel;
        }

        if (territory && mergedConfig.territoryDelta) {
            territory.stability = clamp((territory.stability || 0) + mergedConfig.territoryDelta.stability, 0, 100);
            territory.insurgency = clamp((territory.insurgency || 0) + mergedConfig.territoryDelta.insurgency, 0, 100);
            territory.auPresence = clamp((territory.auPresence || 0) + mergedConfig.territoryDelta.auPresence, 0, 100);
        }

        if (zone && mergedConfig.zoneDelta) {
            zone.insurgency = clamp((zone.insurgency || 0) + mergedConfig.zoneDelta.insurgency, 0, 100);
        }

        if (mergedConfig.metricsDelta) {
            applyMetricsDelta(mergedConfig.metricsDelta);
        }

        updateMetrics();

        const reportTemplate = statusReportTemplates[decisionType];
        if (reportTemplate) {
            const actorEffects = applyActorSentimentDeltas(mergedConfig.actorDeltas);
            const intelEffects = applyIntelDelta(mergedConfig.intelDelta);
            const effects = buildActionReportEffects(reportTemplate, mergedConfig, territory, zone, aiResult, actorEffects, intelEffects);

            recordStatusEntry({
                category: 'Action',
                title: reportTemplate.title,
                summary: reportTemplate.summary,
                effects,
                turn: gameState.turn
            });
        }

        updateResources();

        renderActionOutcomeCard({
            decisionType,
            config: mergedConfig,
            territoryKey,
            territory,
            zone,
            beforeState,
            afterState: {
                metrics: { ...gameState.metrics },
                resources: { ...gameState.resources },
                territory: territory ? { ...territory } : null,
                zone: zone ? { ...zone } : null
            }
        });

        // Show outcome modal
        setTimeout(() => {
            openModal('outcomeModal');
        }, 500);
    }, 1500);
}

function formatSignedNumber(value, suffix = '') {
    const num = Number(value) || 0;
    const sign = num > 0 ? '+' : '';
    const text = `${sign}${num.toLocaleString()}${suffix}`;
    const cls = num > 0 ? 'positive' : num < 0 ? 'negative' : 'neutral';
    return { text, className: cls };
}

function formatSignedCurrency(value) {
    const num = Number(value) || 0;
    const sign = num > 0 ? '+' : num < 0 ? '-' : '';
    const text = `${sign}$${Math.abs(num).toFixed(1)}M`;
    const cls = num > 0 ? 'positive' : num < 0 ? 'negative' : 'neutral';
    return { text, className: cls };
}

function formatValueWithDelta(value, delta) {
    const deltaText = formatSignedNumber(delta);
    return `${value} <span class="delta ${deltaText.className}">(${deltaText.text})</span>`;
}

function renderActionOutcomeCard(payload) {
    const container = document.getElementById('actionOutcomeContainer');
    if (!container) return;

    const { config, territory, zone, beforeState, afterState } = payload;
    const territoryName = territory?.name || 'Unknown Territory';
    const zoneName = zone?.name || 'N/A';

    const metricsDelta = {
        stability: afterState.metrics.stability - beforeState.metrics.stability,
        insurgency: afterState.metrics.insurgency - beforeState.metrics.insurgency,
        civilianSupport: afterState.metrics.civilianSupport - beforeState.metrics.civilianSupport,
        globalLegitimacy: afterState.metrics.globalLegitimacy - beforeState.metrics.globalLegitimacy,
        regionalSynergy: afterState.metrics.regionalSynergy - beforeState.metrics.regionalSynergy
    };

    const resourceDelta = {
        budget: afterState.resources.budget - beforeState.resources.budget,
        personnel: afterState.resources.personnel - beforeState.resources.personnel,
        politicalCapital: afterState.resources.politicalCapital - beforeState.resources.politicalCapital,
        intelPoints: afterState.resources.intelPoints - beforeState.resources.intelPoints
    };

    const territoryDelta = {
        stability: (afterState.territory?.stability || 0) - (beforeState.territory?.stability || 0),
        insurgency: (afterState.territory?.insurgency || 0) - (beforeState.territory?.insurgency || 0),
        auPresence: (afterState.territory?.auPresence || 0) - (beforeState.territory?.auPresence || 0)
    };

    const zoneDelta = {
        insurgency: (afterState.zone?.insurgency || 0) - (beforeState.zone?.insurgency || 0)
    };

    const militiaCount = mapIntelData.filter(item => item.type === 'militia').length;
    const idpCount = mapIntelData.filter(item => item.type === 'idp').length;
    const illicitCount = mapIntelData.filter(item => item.type === 'illicit').length;

    const supportBudget = config.support?.budget || 0;
    const supportPersonnel = config.support?.personnel || 0;
    const supportText = supportBudget || supportPersonnel
        ? `${formatSignedCurrency(supportBudget).text} / ${formatSignedNumber(supportPersonnel).text}`
        : 'None';

    const actorRows = Object.entries(config.actorDeltas || {}).map(([name, value]) => {
        const delta = formatSignedNumber(value);
        return `
            <div class="action-result-row">
                <span>${name}</span>
                <span class="delta ${delta.className}">${delta.text}</span>
            </div>
        `;
    }).join('');

    const riskChips = (config.risks || []).map(risk => `
        <span class="strip-chip warning">${risk}</span>
    `).join('');

    container.innerHTML = `
        <div class="action-result-card">
            <div class="action-result-summary">
                <div>
                    <div class="action-result-title">Action Result: ${config.title}</div>
                    <div class="action-result-subtitle">Outcome: ${config.outcome} | Territory: ${territoryName} | Zone: ${zoneName}</div>
                </div>
                <div class="action-result-pill ${config.pill}">${config.outcome}</div>
            </div>

            <div class="action-result-metrics">
                <div class="action-result-col">
                    <div class="action-result-col-title">Key Actor Sentiments</div>
                    ${actorRows}
                    <div class="action-result-row">
                        <span>International Legitimacy</span>
                        <span class="delta ${formatSignedNumber(metricsDelta.globalLegitimacy).className}">${formatSignedNumber(metricsDelta.globalLegitimacy).text}</span>
                    </div>
                </div>

                <div class="action-result-col">
                    <div class="action-result-col-title">Territory and Zone</div>
                    <div class="action-result-row">
                        <span>Territory Stability</span>
                        <span>${formatValueWithDelta(afterState.territory?.stability ?? 0, territoryDelta.stability)}</span>
                    </div>
                    <div class="action-result-row">
                        <span>Territory Insurgency</span>
                        <span>${formatValueWithDelta(afterState.territory?.insurgency ?? 0, territoryDelta.insurgency)}</span>
                    </div>
                    <div class="action-result-row">
                        <span>AU Presence</span>
                        <span>${formatValueWithDelta(afterState.territory?.auPresence ?? 0, territoryDelta.auPresence)}</span>
                    </div>
                    <div class="action-result-row">
                        <span>Zone Insurgency</span>
                        <span>${formatValueWithDelta(afterState.zone?.insurgency ?? 0, zoneDelta.insurgency)}</span>
                    </div>
                </div>

                <div class="action-result-col">
                    <div class="action-result-subgroup">
                        <div class="action-result-col-title">Resources and Intel</div>
                        <div class="action-result-row">
                            <span>Budget</span>
                            <span class="delta ${formatSignedCurrency(resourceDelta.budget).className}">${formatSignedCurrency(resourceDelta.budget).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Personnel</span>
                            <span class="delta ${formatSignedNumber(resourceDelta.personnel).className}">${formatSignedNumber(resourceDelta.personnel).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Political Capital</span>
                            <span class="delta ${formatSignedNumber(resourceDelta.politicalCapital).className}">${formatSignedNumber(resourceDelta.politicalCapital).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Intel Points</span>
                            <span class="delta ${formatSignedNumber(resourceDelta.intelPoints).className}">${formatSignedNumber(resourceDelta.intelPoints).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>ECOWAS Support</span>
                            <span class="delta ${supportBudget || supportPersonnel ? 'positive' : 'neutral'}">${supportText}</span>
                        </div>
                    </div>
                    <div class="action-result-subgroup">
                        <div class="action-result-col-title">Regional Status</div>
                        <div class="action-result-row">
                            <span>Stability</span>
                            <span class="delta ${formatSignedNumber(metricsDelta.stability).className}">${formatSignedNumber(metricsDelta.stability).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Insurgency</span>
                            <span class="delta ${formatSignedNumber(metricsDelta.insurgency).className}">${formatSignedNumber(metricsDelta.insurgency).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Civilian Support</span>
                            <span class="delta ${formatSignedNumber(metricsDelta.civilianSupport).className}">${formatSignedNumber(metricsDelta.civilianSupport).text}</span>
                        </div>
                        <div class="action-result-row">
                            <span>Regional Synergy</span>
                            <span class="delta ${formatSignedNumber(metricsDelta.regionalSynergy).className}">${formatSignedNumber(metricsDelta.regionalSynergy).text}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-result-strip">
                <div class="action-result-strip-title">Next-turn Risks</div>
                <div class="action-result-strip-items">
                    ${riskChips}
                </div>
            </div>

            <div class="action-result-footer">
                <div class="action-result-footer-item">
                    Militia/Insurgency: ${militiaCount} <span class="delta ${formatSignedNumber(config.intelDelta?.militia || 0).className}">(${formatSignedNumber(config.intelDelta?.militia || 0).text})</span>
                </div>
                <div class="action-result-footer-item">
                    IDP Camps: ${idpCount} <span class="delta ${formatSignedNumber(config.intelDelta?.idp || 0).className}">(${formatSignedNumber(config.intelDelta?.idp || 0).text})</span>
                </div>
                <div class="action-result-footer-item">
                    Illicit Activity: ${illicitCount} <span class="delta ${formatSignedNumber(config.intelDelta?.illicit || 0).className}">(${formatSignedNumber(config.intelDelta?.illicit || 0).text})</span>
                </div>
            </div>
        </div>
    `;
}

// ===== TERRITORY FUNCTIONS =====
function showTerritoryDetails(territoryKey) {
    const territory = gameState.territories[territoryKey];
    if (!territory) return;

    // Zoom map to territory if map is available
    if (map && territory.coords) {
        map.flyTo(territory.coords, 6, {
            animate: true,
            duration: 1.5
        });
    }

    gameState.currentTerritory = territoryKey;

    document.getElementById('territoryName').textContent = territory.name;
    document.getElementById('territoryStability').textContent = territory.stability;
    document.getElementById('territoryInsurgency').textContent = territory.insurgency;
    document.getElementById('territoryPopulation').textContent = territory.population;

    // Update flag
    const territoryFlag = document.getElementById('territoryFlag');
    if (territoryFlag) {
        territoryFlag.innerHTML = `<img src="${territory.flag}" class="flag-icon-img" alt="${territory.name} Flag" style="width: 100%; height: auto; border-radius: 4px;">`;
    }

    // Set situation text based on territory
    const situations = {
        mali: 'Northern regions experiencing heavy insurgent activity. Military junta maintaining control of major population centers but losing ground in rural areas.',
        burkinaFaso: 'Wagner Group contractors increasing influence. Junta consolidating power while civilian protests grow in urban areas.',
        niger: 'French withdrawal creating security vacuum. Multiple armed groups competing for territorial control.',
        chad: 'Regional hub for international operations. Balancing relations with multiple external powers while managing internal ethnic tensions.',
        mauritania: 'Relatively stable but vulnerable to spillover effects. Key partner for regional intelligence sharing.'
    };

    document.getElementById('territorySituation').textContent = situations[territoryKey];

    openModal('territoryModal');
}

// ===== ZONE INVESTIGATION FUNCTIONS =====
function investigateTerritory() {
    const territoryKey = gameState.currentTerritory;
    if (!territoryKey) return;

    closeModal('territoryModal');

    // Show loading briefly
    setTimeout(() => {
        showZones(territoryKey);
    }, 300);
}

function showZones(territoryKey) {
    const zones = zonesData[territoryKey];
    if (!zones) return;

    const territory = gameState.territories[territoryKey];
    document.getElementById('zonesTerritory').textContent = territory.name;

    // Build zones grid
    const zonesGrid = document.getElementById('zonesGrid');
    zonesGrid.innerHTML = '';

    zones.forEach(zone => {
        const zoneCard = document.createElement('div');
        zoneCard.className = 'zone-card';
        if (zone.threat.toLowerCase() === 'critical') {
            zoneCard.classList.add('critical');
        } else if (zone.threat.toLowerCase() === 'low' || zone.threat.toLowerCase() === 'moderate') {
            zoneCard.classList.add('stable');
        }

        const incidentTags = zone.incidents.map(incident =>
            `<span class="incident-tag">${incident}</span>`
        ).join('');

        // formatted population for display
        const popDisplay = zone.population.includes('M') || zone.population.includes('K') ? zone.population : (parseInt(zone.population) / 1000).toFixed(0) + 'K';

        zoneCard.innerHTML = `
            <div class="zone-body">
                <div class="zone-header">
                    <div>
                        <div class="zone-name">${zone.name}</div>
                        <div class="zone-type">${zone.type}</div>
                    </div>
                    <div class="zone-threat ${zone.threat.toLowerCase()}">${zone.threat}</div>
                </div>
                <div class="zone-info">
                    <div class="zone-info-item">
                        <div class="zone-info-label">Population</div>
                        <div class="zone-info-value">${popDisplay}</div>
                    </div>
                    <div class="zone-info-item">
                        <div class="zone-info-label">Insurgency</div>
                        <div class="zone-info-value">${zone.insurgency}/100</div>
                    </div>
                    <div class="zone-info-item">
                        <div class="zone-info-label">Displaced</div>
                        <div class="zone-info-value">${zone.displaced}</div>
                    </div>
                </div>
                <div class="zone-description">${zone.description}</div>
                <div class="zone-incidents">
                    ${incidentTags}
                </div>
            </div>
        `;

        zoneCard.addEventListener('click', () => showZoneDetail(territoryKey, zone));
        zonesGrid.appendChild(zoneCard);
    });

    openModal('zonesModal');
}

function showZoneDetail(territoryKey, zone) {
    closeModal('zonesModal');

    setTimeout(() => {
        const territory = gameState.territories[territoryKey];

        // Update zone image
        const zoneDetailImage = document.getElementById('zoneDetailImage');
        const zoneImagePlaceholder = document.getElementById('zoneImagePlaceholder');
        const zoneImageCoords = document.getElementById('zoneImageCoords');

        if (zoneDetailImage) {
            if (zone.image) {
                zoneDetailImage.src = zone.image;
                zoneDetailImage.alt = `${zone.name} - ${zone.type} in ${territory.name}`;
                zoneDetailImage.classList.remove('is-hidden');
                zoneImagePlaceholder?.classList.add('is-hidden');
            } else {
                zoneDetailImage.removeAttribute('src');
                zoneDetailImage.alt = '';
                zoneDetailImage.classList.add('is-hidden');
                zoneImagePlaceholder?.classList.remove('is-hidden');
            }
        }
        if (zoneImageCoords && zoneCoordinates[zone.id]) {
            zoneImageCoords.textContent = zoneCoordinates[zone.id];
        }

        document.getElementById('zoneDetailName').textContent = zone.name;
        document.getElementById('zoneDetailType').textContent = `${zone.type} - ${territory.name}`;
        document.getElementById('zoneDetailThreat').textContent = zone.threat;
        document.getElementById('zoneDetailThreat').className = 'zone-threat ' + zone.threat.toLowerCase();

        document.getElementById('zoneDetailPopulation').textContent = zone.population;
        document.getElementById('zoneDetailInsurgency').textContent = zone.insurgency;
        document.getElementById('zoneDetailDisplaced').textContent = zone.displaced;

        document.getElementById('zoneDetailSituation').textContent = zone.situation;

        // Build threats list
        const threatsList = document.getElementById('zoneDetailThreats');
        threatsList.innerHTML = '';
        zone.threats.forEach(threat => {
            const li = document.createElement('li');
            li.innerHTML = threat;
            threatsList.appendChild(li);
        });

        renderZoneActors(territoryKey);
        renderSupportActors(territoryKey);

        openModal('zoneDetailModal');
    }, 300);
}

function renderZoneActors(territoryKey) {
    const list = document.getElementById('zoneActorsList');
    if (!list) return;

    list.innerHTML = '';
    const actorKeys = territoryKeyActors[territoryKey] || [];

    if (!actorKeys.length) {
        list.innerHTML = '<div class="zone-actors-empty">No key actors listed.</div>';
        return;
    }

    actorKeys.forEach(actorKey => {
        const actor = actorData[actorKey];
        if (!actor) return;

        const item = document.createElement('div');
        item.className = 'zone-actor-item';

        const avatar = document.createElement('div');
        avatar.className = 'zone-actor-avatar';
        if (actor.avatar) {
            const img = document.createElement('img');
            img.src = actor.avatar;
            img.alt = actor.name || 'Key Actor';
            avatar.appendChild(img);
        } else if (actor.name) {
            avatar.textContent = actor.name.charAt(0);
        } else {
            avatar.textContent = '?';
        }

        const info = document.createElement('div');
        info.className = 'zone-actor-info';

        const name = document.createElement('div');
        name.className = 'zone-actor-name';
        name.textContent = actor.name || actorKey;

        const role = document.createElement('div');
        role.className = 'zone-actor-role';
        role.textContent = actor.faction || 'Key Actor';

        const presence = document.createElement('div');
        presence.className = 'zone-actor-presence';
        presence.textContent = zoneActorPresence[actorKey] || 'Active stakeholder';

        info.appendChild(name);
        info.appendChild(role);
        info.appendChild(presence);

        item.appendChild(avatar);
        item.appendChild(info);

        list.appendChild(item);
    });

    if (!list.children.length) {
        list.innerHTML = '<div class="zone-actors-empty">No key actors listed.</div>';
    }
}

function renderSupportActors(territoryKey) {
    const list = document.getElementById('zoneSupportActorsList');
    if (!list) return;

    list.innerHTML = '';
    const actors = supportActorsByTerritory[territoryKey] || [];

    if (!actors.length) {
        list.innerHTML = '<div class="zone-support-empty">No supporting actors listed.</div>';
        return;
    }

    actors.forEach(actor => {
        const item = document.createElement('div');
        item.className = 'zone-support-actor-item';

        const name = document.createElement('div');
        name.className = 'zone-support-actor-name';
        name.textContent = actor.name;

        const role = document.createElement('div');
        role.className = 'zone-support-actor-role';
        role.textContent = actor.role;

        const impact = document.createElement('div');
        impact.className = 'zone-support-actor-impact';
        impact.textContent = `Influence: ${actor.impact}`;

        item.appendChild(name);
        item.appendChild(role);
        item.appendChild(impact);

        list.appendChild(item);
    });
}

function backToTerritory() {
    closeModal('zonesModal');
    setTimeout(() => {
        if (gameState.currentTerritory) {
            showTerritoryDetails(gameState.currentTerritory);
        }
    }, 300);
}

function backToZones() {
    closeModal('zoneDetailModal');
    setTimeout(() => {
        if (gameState.currentTerritory) {
            showZones(gameState.currentTerritory);
        }
    }, 300);
}

// ===== ACTOR FUNCTIONS =====
let currentActorKey = null;

const actorData = {
    auCommissioner: {
        name: 'AU Commissioner',
        avatar: '../img/avatars/AU Commissioner.png',
        faction: 'African Union',
        profile: 'Your direct supervisor overseeing the Sahel stabilization mandate. Provides strategic guidance, political cover, and accountability to the AU Peace and Security Council.',
        stance: 'Allied oversight. Expects disciplined execution, measurable outcomes, and clear reporting.',
        interests: [
            '<strong>Accountability:</strong> Transparent reporting and outcome tracking',
            '<strong>Mandate Integrity:</strong> Protecting AU legitimacy and sovereignty principles',
            '<strong>Momentum:</strong> Visible progress within the first two acts'
        ]
    },
    goita: {
        name: 'Col. Assimi Goïta',
        avatar: '../img/avatars/Col. Assimi Goïta.png',
        faction: 'Mali Military Junta',
        profile: 'Leader of Mali\'s military junta since the 2021 coup. Former special forces officer with strong nationalist sentiment. Increasingly aligned with Russian interests while distancing from Western partnerships.',
        stance: 'Neutral but wary of AU intervention. Demands full sovereignty and non-interference in internal affairs. Open to security cooperation but resistant to political conditions.',
        interests: [
            '<strong>Security:</strong> Maintaining control against insurgent threats',
            '<strong>Sovereignty:</strong> Resisting external political pressure',
            '<strong>Legitimacy:</strong> Building domestic support for military rule'
        ]
    },
    jnim: {
        name: 'JNIM Leadership',
        avatar: '../img/avatars/JNIM.png',
        faction: 'Insurgent Coalition',
        profile: 'Al-Qaeda affiliated group operating across Mali and Burkina Faso. Led by Iyad Ag Ghaly. Exploits ethnic grievances and governance failures to recruit and expand territorial control.',
        stance: 'Hostile to all state actors and international presence. Seeks to establish Islamic governance while leveraging criminal networks for funding.',
        interests: [
            '<strong>Islamic State:</strong> Establishing Sharia law across the Sahel',
            '<strong>Expulsion:</strong> Removing all Western and UN military presence',
            '<strong>Expansion:</strong> Extending territorial control southward'
        ]
    },
    ecowas: {
        name: 'ECOWAS Commission',
        avatar: '../img/avatars/ECOWAS Commission.png',
        faction: 'Regional Organization',
        profile: 'Economic Community of West African States. Primary regional partner for AU operations. Led by President Jean-Claude Kassi Brou. Struggling to maintain unity amid member state tensions.',
        stance: 'Allied but facing internal challenges. Supports AU mandate but divided on intervention approaches and sanctions policy.',
        interests: [
            '<strong>Democracy:</strong> Restoring constitutional order in junta states',
            '<strong>Stability:</strong> Preventing spillover of conflict to coastal states',
            '<strong>Unity:</strong> Maintaining regional cohesion against fragmentation'
        ]
    },
    tuareg: {
        name: 'Tuareg Coalition',
        avatar: '../img/avatars/Tuareg Coalition.png',
        faction: 'Ethnic Militia Network',
        profile: 'Loose coalition of Tuareg separatist groups in northern Mali and Niger. Historical grievances against central governments. Some factions allied with insurgents, others seeking autonomy deals.',
        stance: 'Neutral with negotiable interests. Open to dialogue on regional autonomy and cultural rights. Key to any lasting peace settlement.',
        interests: [
            '<strong>Autonomy:</strong> Self-governance for Azawad region',
            '<strong>Development:</strong> Economic investment in northern territories',
            '<strong>Rights:</strong> Cultural and linguistic recognition'
        ]
    },
    mauritaniaIntel: {
        name: 'Minister Lamine Ould',
        avatar: '../img/avatars/Minister Lamine Ould Mauritania Security Directorate.png',
        faction: 'Mauritania Security Directorate',
        profile: 'Senior official overseeing Mauritania\'s internal security and border intelligence coordination. Focused on preventing spillover from Mali while maintaining regional partnerships.',
        stance: 'Allied but cautious. Prioritizes sovereignty and discrete intelligence cooperation.',
        interests: [
            '<strong>Border Control:</strong> Preventing militant infiltration from Mali',
            '<strong>Intelligence Sharing:</strong> Coordinated threat tracking with AU partners',
            '<strong>Stability:</strong> Preserving Mauritania\'s hard-won security gains'
        ]
    },
    chadTransitional: {
        name: 'Amb. Halima Djerma',
        avatar: '../img/avatars/Amb. Halima Djerma Chad Transitional Government.png',
        faction: 'Chad Transitional Government',
        profile: 'Senior envoy for the transitional government, balancing external security partnerships with domestic reform pressures and regional stabilization commitments.',
        stance: 'Neutral. Seeks support without compromising internal transition timelines.',
        interests: [
            '<strong>Transition Support:</strong> Maintaining legitimacy during political reforms',
            '<strong>Security Capacity:</strong> Strengthening rapid response in Lake Chad Basin',
            '<strong>Regional Coordination:</strong> Aligning with neighbors on cross-border threats'
        ]
    },
    burkinaJunta: {
        name: 'Capt. Ousmane Traore',
        avatar: '../img/avatars/Capt. Ousmane Traore Burkina Faso Junta.png',
        faction: 'Burkina Faso Junta',
        profile: 'Military leader consolidating authority in Ouagadougou while facing mounting insurgent pressure in the north and east.',
        stance: 'Guarded and transactional. Demands respect for sovereignty and rapid security gains.',
        interests: [
            '<strong>Regime Security:</strong> Retaining control amid insurgent advances',
            '<strong>Operational Support:</strong> Equipment, training, and intelligence',
            '<strong>Legitimacy:</strong> Managing public expectations and unrest'
        ]
    },
    burkinaCivil: {
        name: 'Amina Ouedraogo',
        avatar: '../img/avatars/Amina Ouedraogo Burkina Civil Society Network.png',
        faction: 'Burkina Civil Society Network',
        profile: 'Coordinator for civil society and humanitarian groups advocating for civilian protection and service delivery in conflict-affected areas.',
        stance: 'Allied on humanitarian goals. Presses for civilian protection and accountability.',
        interests: [
            '<strong>Humanitarian Access:</strong> Safe corridors for aid delivery',
            '<strong>Community Protection:</strong> Reducing abuses and displacement',
            '<strong>Local Governance:</strong> Supporting civic structures in crisis zones'
        ]
    },
    nigerJunta: {
        name: 'Gen. Abdou Karim',
        avatar: '../img/avatars/Gen. Abdou Karim Niger Transitional Council.png',
        faction: 'Niger Transitional Council',
        profile: 'Senior security figure shaping Niger\'s post-coup security posture as foreign forces withdraw and insurgent activity intensifies.',
        stance: 'Neutral with firm red lines. Seeks assistance without political conditions.',
        interests: [
            '<strong>Territorial Control:</strong> Securing border regions and transport corridors',
            '<strong>Force Readiness:</strong> Training and equipment support',
            '<strong>Sovereignty:</strong> Limiting external influence in domestic affairs'
        ]
    },
    nigerHumanitarian: {
        name: 'Dr. Salif Issoufou',
        avatar: '../img/avatars/Dr. Salif Issoufou Niger Humanitarian Coalition.png',
        faction: 'Niger Humanitarian Coalition',
        profile: 'Leads interagency relief coordination for IDP camps and cross-border displacement sites in Diffa and Tillaberi.',
        stance: 'Allied on civilian protection. Prioritizes rapid relief and safe access.',
        interests: [
            '<strong>IDP Support:</strong> Shelter, food, and medical access',
            '<strong>Protection:</strong> Safeguards for vulnerable populations',
            '<strong>Logistics:</strong> Reliable transport and supply pipelines'
        ]
    },
    wagner: {
        name: 'Wagner Group',
        avatar: '../img/avatars/Wagner Group.png',
        faction: 'Private Military Company',
        profile: 'Russian private military contractors expanding influence across the Sahel. Providing security services to junta governments in exchange for resource access and strategic positioning.',
        stance: 'Adversarial to AU and Western presence. Actively undermining regional stability to create dependency on Russian support.',
        interests: [
            '<strong>Resources:</strong> Securing mining concessions and revenue',
            '<strong>Influence:</strong> Expanding Russian geopolitical leverage',
            '<strong>Displacement:</strong> Replacing Western security partnerships'
        ]
    }
};

const territoryKeyActors = {
    mali: ['goita', 'jnim', 'tuareg', 'wagner'],
    burkinaFaso: ['burkinaJunta', 'burkinaCivil'],
    niger: ['nigerJunta', 'nigerHumanitarian'],
    chad: ['chadTransitional'],
    mauritania: ['mauritaniaIntel']
};

const zoneActorPresence = {
    goita: 'Orders local garrison posture',
    jnim: 'Active combat operations',
    tuareg: 'Negotiates local autonomy',
    wagner: 'Contracted security advisers',
    burkinaJunta: 'Directs national security response',
    burkinaCivil: 'Mobilizes civilian networks',
    nigerJunta: 'Controls national command nodes',
    nigerHumanitarian: 'Coordinates IDP relief',
    chadTransitional: 'Oversees Lake Chad response',
    mauritaniaIntel: 'Runs border intel cell'
};

const supportActorsByTerritory = {
    mali: [
        { name: 'Local Civil Society Network', role: 'Community NGOs', impact: 'Mobilizes public trust and shapes aid access.' },
        { name: 'Traditional Leaders Council', role: 'Customary Governance', impact: 'Legitimizes agreements and mediates local disputes.' },
        { name: 'Humanitarian Operations Cluster', role: 'UN / NGO Coordination', impact: 'Grades outcomes based on civilian protection and access.' }
    ],
    burkinaFaso: [
        { name: 'IDP Coordination Unit', role: 'Displacement Response', impact: 'Tracks camp conditions and civilian risk.' },
        { name: 'Religious Mediation Council', role: 'Faith Leaders', impact: 'Can lower tensions through local dialogue.' },
        { name: 'Regional Traders Union', role: 'Market Networks', impact: 'Influences supply chains and price stability.' }
    ],
    niger: [
        { name: 'Diffa Relief Consortium', role: 'Humanitarian Coalition', impact: 'Sets expectations for camp support and access.' },
        { name: 'Pastoralist Council', role: 'Livelihoods Mediation', impact: 'Stabilizes grazing routes and conflict risks.' },
        { name: 'Regional Water Authority', role: 'Infrastructure Agency', impact: 'Impacts service delivery and community trust.' }
    ],
    chad: [
        { name: 'Lake Chad Basin Commission', role: 'Regional Coordination', impact: 'Shapes cross-border security collaboration.' },
        { name: 'Customary Chiefs Council', role: 'Local Governance', impact: 'Validates ceasefires and community compliance.' },
        { name: 'Anti-trafficking Unit', role: 'Security Task Force', impact: 'Targets illicit corridors tied to insurgent finance.' }
    ],
    mauritania: [
        { name: 'Desert Border Patrol Coalition', role: 'Border Security', impact: 'Reports incursions and smuggling routes.' },
        { name: 'Fisheries and Trade Union', role: 'Economic Stakeholder', impact: 'Pressure on port stability and labor response.' },
        { name: 'Community Reconciliation Forum', role: 'Mediation Network', impact: 'Tracks local grievances and reconciliation progress.' }
    ]
};

// Actor Dialogue Data
const actorDialogues = {
    auCommissioner: {
        avatar: '../img/avatars/AU Commissioner.png',
        name: 'AU Commissioner',
        title: 'AU Commissioner for Political Affairs, Peace & Security',
        relationship: 'Allied - Oversight',
        message: '"Special Envoy, provide your latest actions and outcomes. The Council expects clear progress and risk mitigation."',
        context: 'The Commissioner manages the AU mandate and political backing for your mission. Maintaining trust and demonstrating impact is essential for continued support.',
        options: [
            {
                icon: 'AU',
                title: 'Deliver Status Brief',
                description: '"Here is a concise update on actions taken, results achieved, and next steps."',
                effects: [
                    { type: 'positive', label: '+10 Political Capital' },
                    { type: 'neutral', label: 'Maintains Mandate Support' }
                ]
            },
            {
                icon: 'REQ',
                title: 'Request Expanded Mandate',
                description: '"We need broader authority to act faster on the ground. Requesting expanded rules of engagement."',
                effects: [
                    { type: 'positive', label: '+5 Global Legitimacy' },
                    { type: 'negative', label: 'Requires Council Approval' }
                ]
            }
        ]
    },
    goita: {
        avatar: '../img/avatars/Col. Assimi Goïta.png',
        name: 'Col. Assimi Goïta',
        title: 'Chairman, National Committee for the Salvation of the People (Mali)',
        relationship: 'Neutral • Cautious',
        message: '"Special Envoy, I respect the African Union\'s intentions, but Mali\'s sovereignty is not negotiable. We\'ve seen what external interventions achieve—dependency and resentment. If you want our cooperation, recognize that we know what\'s best for our own people."',
        context: 'Colonel Goïta has consolidated power since the 2021 coup, increasingly aligning with Russian interests through Wagner Group contractors. He faces pressure from ECOWAS sanctions while managing internal security threats from JNIM and other insurgent groups. His primary concern is maintaining sovereignty while securing the regime against both external and internal challenges.',
        options: [
            {
                icon: '🤝',
                title: 'Appeal to Pan-African Unity',
                description: '"Colonel, we are all Africans solving African problems. External powers—whether France or Russia—want to divide us. The AU respects Mali\'s sovereignty. We offer partnership, not interference."',
                effects: [
                    { type: 'positive', label: '+15 Political Capital' },
                    { type: 'positive', label: 'Improves Relationship' },
                    { type: 'neutral', label: 'Slow Progress' }
                ]
            },
            {
                icon: '⚖️',
                title: 'Acknowledge Past Failures',
                description: '"You\'re right that past interventions failed. The AU learns from history. We propose a Malian-led framework with AU technical support—your priorities, our resources."',
                effects: [
                    { type: 'positive', label: '+20 Political Capital' },
                    { type: 'positive', label: 'Strong Trust Building' },
                    { type: 'negative', label: '-5M Budget (Support Costs)' }
                ]
            },
            {
                icon: '🎯',
                title: 'Focus on Mutual Security Interests',
                description: '"JNIM threatens both of us. Wagner can\'t solve your insurgency—they create new dependencies. Let\'s discuss a joint counterterrorism strategy that keeps Mali sovereign and secure."',
                effects: [
                    { type: 'positive', label: '+10 Political Capital' },
                    { type: 'positive', label: 'Opens Security Cooperation' },
                    { type: 'negative', label: 'Wagner Complications' }
                ]
            },
            {
                icon: '💰',
                title: 'Offer Economic Incentives',
                description: '"The AU can facilitate sanctions relief through ECOWAS if Mali commits to a constitutional transition timeline. Concrete benefits for concrete steps."',
                effects: [
                    { type: 'positive', label: '+25 Political Capital' },
                    { type: 'negative', label: '-15M Budget' },
                    { type: 'neutral', label: 'Conditional Progress' }
                ]
            }
        ]
    },
    jnim: {
        avatar: '../img/avatars/JNIM.png',
        name: 'JNIM Leadership',
        title: 'Jama\'at Nusrat al-Islam wal-Muslimin (Al-Qaeda Affiliate)',
        relationship: 'Hostile • Uncompromising',
        message: '"The African Union represents the same failed states that oppress our people. Your secular governments are corrupt, your borders are colonial impositions, and your \'stability\' means continued Western domination. There can be no peace while injustice prevails."',
        context: 'JNIM operates across Mali and Burkina Faso with estimated 2,000+ fighters. Led by Iyad Ag Ghaly, the group exploits ethnic grievances, governance failures, and economic marginalization to recruit and expand. Their ideology rejects state authority entirely, making negotiation extremely difficult. However, some local JNIM commanders have accepted temporary truces when it serves tactical interests.',
        options: [
            {
                icon: '🕊️',
                title: 'Explore Back-Channel Communication',
                description: '"While we fundamentally disagree, civilian lives matter. Can we establish communication channels to prevent harm to non-combatants and discuss localized ceasefires?"',
                effects: [
                    { type: 'positive', label: '+5 Intel Points' },
                    { type: 'negative', label: '-20 Political Capital (Controversial)' },
                    { type: 'neutral', label: 'Potential Ceasefire Options' }
                ]
            },
            {
                icon: '🎯',
                title: 'Address Root Grievances',
                description: '"Your fighters come from marginalized communities with legitimate grievances. The AU can push governments to address injustice—education, economic opportunity, political inclusion. Violence isn\'t the only path."',
                effects: [
                    { type: 'positive', label: '+10 Civilian Support' },
                    { type: 'neutral', label: 'Long-term De-escalation Potential' },
                    { type: 'negative', label: 'No Immediate Impact' }
                ]
            },
            {
                icon: '⚡',
                title: 'Highlight Movement Divisions',
                description: '"Your organization isn\'t united. Local commanders make pragmatic deals while leadership demands absolute positions. We can work with those seeking practical solutions."',
                effects: [
                    { type: 'positive', label: '+15 Intel Points' },
                    { type: 'positive', label: 'Potential Splinter Negotiations' },
                    { type: 'negative', label: 'Risks Hardliner Retaliation' }
                ]
            },
            {
                icon: '🛡️',
                title: 'Reject Engagement Entirely',
                description: '"The AU does not negotiate with terrorist organizations. Your violence against civilians disqualifies you from political dialogue. We will support military operations against JNIM."',
                effects: [
                    { type: 'positive', label: '+15 Global Legitimacy' },
                    { type: 'negative', label: 'Closes Diplomatic Options' },
                    { type: 'negative', label: 'Escalates Conflict' }
                ]
            }
        ]
    },
    ecowas: {
        avatar: '../img/avatars/ECOWAS Commission.png',
        name: 'ECOWAS Commission',
        title: 'Economic Community of West African States',
        relationship: 'Allied • Strained',
        message: '"Special Envoy, ECOWAS appreciates AU support, but we need more than words. Our sanctions policy is failing—it punishes populations without changing regime behavior. Member states are divided. We need the AU to either back our approach fully or help us find a new one."',
        context: 'ECOWAS faces existential crisis as Mali, Burkina Faso, and Niger form alternative alliance rejecting its authority. The organization\'s traditional tools—sanctions and threat of intervention—are proving counterproductive. Internal divisions between hardline states (Nigeria) and engagement advocates (Senegal) paralyze decision-making. ECOWAS needs AU political cover to shift strategy without appearing to reward coups.',
        options: [
            {
                icon: '🤝',
                title: 'Propose Joint AU-ECOWAS Framework',
                description: '"Let\'s create a unified approach. The AU provides continental legitimacy, ECOWAS maintains regional ownership. We develop phased sanctions relief linked to democratic milestones."',
                effects: [
                    { type: 'positive', label: '+30 Political Capital' },
                    { type: 'positive', label: '+20 Global Legitimacy' },
                    { type: 'positive', label: 'Strengthens Regional Synergy' }
                ]
            },
            {
                icon: '🔄',
                title: 'Advocate Policy Pivot',
                description: '"Sanctions aren\'t working. ECOWAS should shift to engagement with clear conditions—constitutional timelines, human rights standards, anti-corruption measures. Carrots and sticks, not just sticks."',
                effects: [
                    { type: 'positive', label: '+25 Political Capital' },
                    { type: 'negative', label: '-10 Global Legitimacy (Perceived Soft)' },
                    { type: 'positive', label: 'Opens Junta Dialogue' }
                ]
            },
            {
                icon: '💪',
                title: 'Support Hardline Stance',
                description: '"ECOWAS must not reward coups. Maintain sanctions, threaten military intervention if necessary. The AU will support enforcement to preserve democratic norms continent-wide."',
                effects: [
                    { type: 'positive', label: '+30 Global Legitimacy' },
                    { type: 'negative', label: '-25 Political Capital' },
                    { type: 'negative', label: 'Risks Regional Fracture' }
                ]
            },
            {
                icon: '🎯',
                title: 'Focus on Security First',
                description: '"Democracy matters, but immediate threat is jihadist expansion. ECOWAS should temporarily deprioritize governance reform to enable security cooperation with all Sahel states, including juntas."',
                effects: [
                    { type: 'positive', label: '+20 Political Capital' },
                    { type: 'negative', label: '-15 Global Legitimacy' },
                    { type: 'positive', label: 'Improved Military Cooperation' }
                ]
            }
        ]
    },
    tuareg: {
        avatar: '../img/avatars/Tuareg Coalition.png',
        name: 'Tuareg Coalition',
        title: 'Coordination of Azawad Movements (CMA)',
        relationship: 'Neutral • Negotiable',
        message: '"For decades, Tuareg people have been marginalized by Bamako governments—Arab, French-backed, military, it makes no difference. We don\'t seek to destroy Mali, we seek autonomy for Azawad. The AU can either help broker a real solution or watch us continue fighting."',
        context: 'The Tuareg question predates current Sahel crisis. Multiple rebellions since Mali\'s independence reflect genuine grievances: political exclusion, economic marginalization, cultural suppression. The 2015 Algiers Accord promised decentralization but implementation stalled. Some Tuareg factions allied with jihadists tactically, others with Mali military, creating complex loyalties. CMA represents mainstream political Tuareg leadership seeking negotiated settlement.',
        options: [
            {
                icon: '📜',
                title: 'Revive Algiers Accord Implementation',
                description: '"The 2015 Accord framework still works. Let\'s establish AU monitoring of decentralization commitments and create accountability for both sides. Regional autonomy within Malian sovereignty."',
                effects: [
                    { type: 'positive', label: '+30 Political Capital' },
                    { type: 'positive', label: '+15 Regional Synergy' },
                    { type: 'negative', label: 'Mali Government Resistance' }
                ]
            },
            {
                icon: '💼',
                title: 'Focus on Economic Development',
                description: '"Autonomy debates are complex. Let\'s start with what everyone agrees on—economic investment in northern regions. Jobs, infrastructure, services. Political solutions follow economic progress."',
                effects: [
                    { type: 'positive', label: '+20 Civilian Support' },
                    { type: 'negative', label: '-10M Budget' },
                    { type: 'neutral', label: 'Long-term Trust Building' }
                ]
            },
            {
                icon: '🛡️',
                title: 'Integrate Tuareg Forces into National Army',
                description: '"Northern Mali needs security. Integrate CMA fighters into Malian military with guarantees of northern deployment and Tuareg command positions. Security through inclusion."',
                effects: [
                    { type: 'positive', label: '+25 Political Capital' },
                    { type: 'positive', label: 'Reduced Insurgency' },
                    { type: 'negative', label: 'Implementation Risks' }
                ]
            },
            {
                icon: '⚠️',
                title: 'Warn Against Jihadist Alliance',
                description: '"Some Tuareg work with JNIM and ISGS. This delegitimizes your political claims and invites military response. Distance yourselves from jihadists or lose AU support."',
                effects: [
                    { type: 'positive', label: '+15 Global Legitimacy' },
                    { type: 'negative', label: '-15 Political Capital' },
                    { type: 'neutral', label: 'Forces Choice on CMA' }
                ]
            }
        ]
    },
    mauritaniaIntel: {
        avatar: '../img/avatars/Minister Lamine Ould Mauritania Security Directorate.png',
        name: 'Minister Lamine Ould',
        title: 'Mauritania Security Directorate',
        relationship: 'Allied - Discreet',
        message: '"Mauritania has contained spillover through disciplined border control and quiet intelligence work. We can support AU operations if coordination remains focused and discreet."',
        context: 'Mauritania prioritizes stability and intelligence-led security. Cooperation is strongest when it respects sovereignty and operational discretion.',
        options: [
            {
                icon: 'INT',
                title: 'Propose Joint Intel Cell',
                description: '"Let\'s formalize intelligence sharing on cross-border movement and financing."',
                effects: [
                    { type: 'positive', label: '+10 Intel Points' },
                    { type: 'positive', label: 'Improved Early Warning' }
                ]
            },
            {
                icon: 'BORD',
                title: 'Support Border Tech Upgrade',
                description: '"The AU can help fund sensors and mobile units along high-risk corridors."',
                effects: [
                    { type: 'positive', label: '+5 Stability' },
                    { type: 'negative', label: '-5M Budget' }
                ]
            }
        ]
    },
    chadTransitional: {
        avatar: '../img/avatars/Amb. Halima Djerma Chad Transitional Government.png',
        name: 'Amb. Halima Djerma',
        title: 'Chad Transitional Government Envoy',
        relationship: 'Neutral - Cautious',
        message: '"Chad will coordinate, but the transition is fragile. Security commitments must not undermine domestic legitimacy."',
        context: 'Chad balances regional security roles with internal reform pressures. External support is welcomed if it strengthens transition credibility.',
        options: [
            {
                icon: 'GOV',
                title: 'Support Transition Roadmap',
                description: '"The AU can back a clear timeline and provide technical support for elections."',
                effects: [
                    { type: 'positive', label: '+8 Global Legitimacy' },
                    { type: 'neutral', label: 'Builds Trust' }
                ]
            },
            {
                icon: 'SEC',
                title: 'Coordinate Lake Chad Operations',
                description: '"Align rapid response patrols and intelligence for the basin."',
                effects: [
                    { type: 'positive', label: '-5 Insurgency' },
                    { type: 'negative', label: '-3 Political Capital' }
                ]
            }
        ]
    },
    burkinaJunta: {
        avatar: '../img/avatars/Capt. Ousmane Traore Burkina Faso Junta.png',
        name: 'Capt. Ousmane Traore',
        title: 'Burkina Faso Junta Leader',
        relationship: 'Guarded - Transactional',
        message: '"We need results. Our people expect security, not lectures. If the AU can deliver support quickly, we will listen."',
        context: 'The junta seeks immediate battlefield impact while resisting external political pressure.',
        options: [
            {
                icon: 'SEC',
                title: 'Offer Rapid Security Support',
                description: '"Targeted training and equipment tied to civilian protection commitments."',
                effects: [
                    { type: 'positive', label: '+10 Political Capital' },
                    { type: 'negative', label: '-8M Budget' }
                ]
            },
            {
                icon: 'DIP',
                title: 'Propose Phased Sanctions Relief',
                description: '"Benchmarks for transition in exchange for economic easing."',
                effects: [
                    { type: 'positive', label: '+15 Political Capital' },
                    { type: 'negative', label: '-5 Global Legitimacy' }
                ]
            }
        ]
    },
    burkinaCivil: {
        avatar: '../img/avatars/Amina Ouedraogo Burkina Civil Society Network.png',
        name: 'Amina Ouedraogo',
        title: 'Burkina Civil Society Network',
        relationship: 'Allied - Community Focus',
        message: '"Civilians are trapped between insurgents and security forces. We need safe access and accountability."',
        context: 'Civil society actors influence legitimacy and civilian cooperation, especially in contested zones.',
        options: [
            {
                icon: 'AID',
                title: 'Back Community Protection',
                description: '"Fund local protection committees and early warning networks."',
                effects: [
                    { type: 'positive', label: '+12 Civilian Support' },
                    { type: 'negative', label: '-4M Budget' }
                ]
            },
            {
                icon: 'ACC',
                title: 'Support Accountability Mechanisms',
                description: '"Document abuses and build channels for civilian reporting."',
                effects: [
                    { type: 'positive', label: '+6 Global Legitimacy' },
                    { type: 'neutral', label: 'Improves Trust' }
                ]
            }
        ]
    },
    nigerJunta: {
        avatar: '../img/avatars/Gen. Abdou Karim Niger Transitional Council.png',
        name: 'Gen. Abdou Karim',
        title: 'Niger Transitional Council',
        relationship: 'Neutral - Sovereignty First',
        message: '"We will accept assistance, but Niger decides its own path. No imposed political conditions."',
        context: 'Niger seeks security capacity while navigating external pressure and internal legitimacy questions.',
        options: [
            {
                icon: 'TRN',
                title: 'Offer Training Package',
                description: '"Border security training with AU oversight and human rights standards."',
                effects: [
                    { type: 'positive', label: '-6 Insurgency' },
                    { type: 'negative', label: '-6M Budget' }
                ]
            },
            {
                icon: 'INT',
                title: 'Request Intel Cooperation',
                description: '"Share cross-border threat data to stabilize the tri-border area."',
                effects: [
                    { type: 'positive', label: '+8 Intel Points' },
                    { type: 'neutral', label: 'Builds Confidence' }
                ]
            }
        ]
    },
    nigerHumanitarian: {
        avatar: '../img/avatars/Dr. Salif Issoufou Niger Humanitarian Coalition.png',
        name: 'Dr. Salif Issoufou',
        title: 'Niger Humanitarian Coalition Lead',
        relationship: 'Allied - Humanitarian Priority',
        message: '"The camps are stretched beyond capacity. Without safe corridors, we will lose thousands."',
        context: 'Humanitarian leaders shape civilian support and international legitimacy by documenting access and protection outcomes.',
        options: [
            {
                icon: 'AID',
                title: 'Open Humanitarian Corridors',
                description: '"Guarantee safe passage for aid convoys and medical teams."',
                effects: [
                    { type: 'positive', label: '+15 Civilian Support' },
                    { type: 'negative', label: '-5 Political Capital' }
                ]
            },
            {
                icon: 'LOG',
                title: 'Deploy Logistics Airlift',
                description: '"Use AU assets to reach besieged camps rapidly."',
                effects: [
                    { type: 'positive', label: '+10 Global Legitimacy' },
                    { type: 'negative', label: '-7M Budget' }
                ]
            }
        ]
    },
    wagner: {
        avatar: '../img/avatars/Wagner Group.png',
        name: 'Wagner Group Representative',
        title: 'Private Military Contractor',
        relationship: 'Adversarial • Uncooperative',
        message: '"We operate at the invitation of sovereign governments. What Bamako, Ouagadougou, or Niamey do with their security partnerships is not AU business. If you want to discuss something, talk to our clients."',
        context: 'Wagner Group operates with intentional opacity and deniability. They answer to Russian geopolitical interests, not humanitarian concerns. Engaging directly is largely futile—their presence is symptom, not cause. The real audience is the junta governments employing them. However, documenting Wagner human rights violations and exposing their actual performance record (mixed at best) can create political pressure.',
        options: [
            {
                icon: '📋',
                title: 'Document Human Rights Violations',
                description: '"We\'re compiling evidence of Wagner abuses against civilians. This documentation will go to international bodies and will be presented to your client governments."',
                effects: [
                    { type: 'positive', label: '+10 Global Legitimacy' },
                    { type: 'positive', label: '+10 Intel Points' },
                    { type: 'negative', label: 'Wagner Hostility Increases' }
                ]
            },
            {
                icon: '🎯',
                title: 'Highlight Operational Failures',
                description: '"Your record in the Sahel is mixed at best. Moura massacre, failed operations, alienated populations. We\'ll ensure your clients know the actual costs of your services."',
                effects: [
                    { type: 'positive', label: '+15 Intel Points' },
                    { type: 'positive', label: 'Weakens Wagner Reputation' },
                    { type: 'neutral', label: 'No Immediate Effect' }
                ]
            },
            {
                icon: '🤐',
                title: 'Avoid Direct Engagement',
                description: '"We have no interest in dialogue with mercenaries. The AU will work with legitimate governments directly to address their security needs without dependency on external contractors."',
                effects: [
                    { type: 'positive', label: '+5 Global Legitimacy' },
                    { type: 'neutral', label: 'No Change in Wagner Operations' },
                    { type: 'neutral', label: 'Focuses on Alternative Approaches' }
                ]
            },
            {
                icon: '💥',
                title: 'Threaten Accountability',
                description: '"International humanitarian law applies to all combatants. Wagner personnel can be held accountable for violations. We\'re building legal cases now."',
                effects: [
                    { type: 'positive', label: '+20 Global Legitimacy' },
                    { type: 'negative', label: 'Russian Diplomatic Pressure' },
                    { type: 'neutral', label: 'Long-term Legal Process' }
                ]
            }
        ]
    }
};

function showActorDetails(actorKey) {
    currentActorKey = actorKey;
    const actor = actorData[actorKey];
    if (!actor) return;

    document.getElementById('actorName').textContent = actor.name;
    document.getElementById('actorFaction').textContent = actor.faction;

    // Update Avatar
    const avatarContainer = document.getElementById('actorAvatarContainer');
    if (avatarContainer && actor.avatar) {
        if (actor.avatar.includes('/') || actor.avatar.includes('.')) {
            avatarContainer.innerHTML = `<img src="${actor.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            avatarContainer.innerHTML = `<span class="actor-avatar-text">${actor.avatar}</span>`;
        }
    }
    document.getElementById('actorProfile').textContent = actor.profile;
    document.getElementById('actorStance').textContent = actor.stance;

    // Populate interests
    const interestsList = document.getElementById('actorInterestsList');
    if (interestsList && actor.interests) {
        interestsList.innerHTML = '';
        actor.interests.forEach(interest => {
            const li = document.createElement('li');
            li.innerHTML = interest;
            interestsList.appendChild(li);
        });
    }

    openModal('actorModal');
}

// ===== TURN MANAGEMENT =====
function endTurn() {
    if (gameState.actionsRemaining > 0) {
        const confirm = window.confirm('You have ' + gameState.actionsRemaining + ' actions remaining. End turn anyway?');
        if (!confirm) return;
    }

    // Show loading
    const actionBar = document.querySelector('.action-bar');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay active';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    actionBar.style.position = 'relative';
    actionBar.appendChild(loadingOverlay);

    setTimeout(() => {
        loadingOverlay.remove();

        // Progress turn
        const beforeMetrics = { ...gameState.metrics };
        gameState.turn++;
        gameState.actionsRemaining = gameState.maxActions;

        const aiTurnResult = runTurnAIModel();

        // Clamp values
        gameState.metrics.stability = Math.max(0, Math.min(100, gameState.metrics.stability));
        gameState.metrics.insurgency = Math.max(0, Math.min(100, gameState.metrics.insurgency));
        gameState.metrics.civilianSupport = Math.max(0, Math.min(100, gameState.metrics.civilianSupport));

        updateMetrics();
        updateResources();
        updateActionBar();
        updateTurnCounter();
        updateStatusReport();

        showNotification('Turn ' + gameState.turn, 'New intelligence reports available. Situation evolving.', false);

        // Add new intel item
        addIntelItem('Just now', 'Turn ' + gameState.turn + ' begins. Regional situation continues to develop. Monitor metrics closely.');

        const metricDeltas = [
            { label: 'Stability', delta: gameState.metrics.stability - beforeMetrics.stability },
            { label: 'Insurgency', delta: gameState.metrics.insurgency - beforeMetrics.insurgency },
            { label: 'Civilian Support', delta: gameState.metrics.civilianSupport - beforeMetrics.civilianSupport }
        ];
        const effects = metricDeltas.map(item => {
            const signed = formatSignedNumber(item.delta);
            return { label: `${item.label} ${signed.text}`, type: signed.className };
        });
        if (aiTurnResult?.effects?.length) {
            effects.push(...aiTurnResult.effects);
        }

        recordStatusEntry({
            category: 'Turn',
            title: `Turn ${gameState.turn} Transition`,
            summary: 'Regional metrics shifted as opposition adapted and intel signals evolved.',
            effects,
            turn: gameState.turn
        });

    }, 2000);
}

function addIntelItem(time, text, isUrgent = false) {
    const intelFeed = document.querySelector('.intel-feed');
    const newIntel = document.createElement('div');
    newIntel.className = 'intel-item' + (isUrgent ? ' urgent' : '');
    newIntel.innerHTML = `
        <div class="intel-time">${time}</div>
        <div class="intel-text">${text}</div>
    `;
    intelFeed.insertBefore(newIntel, intelFeed.children[1]);

    // Remove oldest if more than 5
    const items = intelFeed.querySelectorAll('.intel-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

// ===== INTEL REPORT FUNCTIONS =====
function showIntelReport(reportKey) {
    const report = intelReports[reportKey];
    if (!report) return;

    // Populate report details
    document.getElementById('reportHeadline').textContent = report.headline;
    document.getElementById('reportSubheadline').textContent = report.subheadline;
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('reportLocation').textContent = report.location;
    document.getElementById('reportSource').textContent = report.source;

    // Update Image
    const reportImg = document.getElementById('reportImage');
    if (reportImg) {
        if (report.image && report.image.includes('/')) {
            reportImg.src = report.image;
            reportImg.style.display = 'block';
            reportImg.parentElement.style.display = 'block';
        } else {
            reportImg.style.display = 'none';
            // Use placeholder if it was just an emoji before (backward compatibility) or hide
            reportImg.parentElement.style.display = 'none';
        }
    }

    document.getElementById('reportCaption').textContent = report.imageCaption;
    document.getElementById('reportBody').innerHTML = report.content;
    document.getElementById('reportFooterSources').innerHTML = `<strong>Sources:</strong> ${report.sources}`;

    // Show urgency badge if urgent
    const urgentBadge = document.getElementById('reportUrgent');
    if (urgentBadge && report.urgency.toLowerCase().includes('immediate')) {
        urgentBadge.style.display = 'block';
    } else if (urgentBadge) {
        urgentBadge.style.display = 'none';
    }

    // Show overlay
    const overlay = document.getElementById('intelReportOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function closeIntelReport() {
    const overlay = document.getElementById('intelReportOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ===== ACTOR DIALOGUE FUNCTIONS =====
function determineActorKey(actorCard) {
    // Determine actor key based on card content
    const dataKey = actorCard.getAttribute('data-actor');
    if (dataKey) return dataKey;
    const actorName = actorCard.querySelector('.actor-name')?.textContent.toLowerCase();
    if (!actorName) return null;

    if (actorName.includes('goïta') || actorName.includes('goita')) return 'goita';
    if (actorName.includes('au commissioner') || actorName.includes('african union')) return 'auCommissioner';
    if (actorName.includes('jnim')) return 'jnim';
    if (actorName.includes('ecowas')) return 'ecowas';
    if (actorName.includes('tuareg')) return 'tuareg';
    if (actorName.includes('wagner')) return 'wagner';

    return null;
}

function showActorDialogue(actorKey) {
    const dialogue = actorDialogues[actorKey];
    if (!dialogue) return;

    // Populate dialogue details
    const avatarEl = document.getElementById('dialogueAvatar');
    if (dialogue.avatar.includes('/') || dialogue.avatar.includes('.')) {
        avatarEl.innerHTML = `<img src="${dialogue.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatarEl.textContent = dialogue.avatar;
    }
    document.getElementById('dialogueName').textContent = dialogue.name;
    document.getElementById('dialogueFaction').textContent = dialogue.title;
    document.getElementById('dialogueRelationship').textContent = dialogue.relationship;
    document.getElementById('dialogueMessage').textContent = dialogue.message;

    // Calculate relationship meter (simplified)
    const relationshipFill = document.getElementById('relationshipFill');
    if (relationshipFill) {
        if (dialogue.relationship.toLowerCase().includes('allied')) {
            relationshipFill.style.width = '80%';
        } else if (dialogue.relationship.toLowerCase().includes('neutral')) {
            relationshipFill.style.width = '50%';
        } else if (dialogue.relationship.toLowerCase().includes('hostile')) {
            relationshipFill.style.width = '20%';
        }
    }

    // Build dialogue options
    const optionsContainer = document.getElementById('dialogueOptionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        dialogue.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dialogue-option';

            const effectsHTML = option.effects.map(effect => {
                const effectClass = effect.type === 'positive' ? 'positive' : effect.type === 'negative' ? 'negative' : '';
                return `<span class="dialogue-option-consequence ${effectClass}">${effect.label}</span>`;
            }).join(' ');

            optionDiv.innerHTML = `
                <div class="dialogue-option-label">${option.icon} ${option.title}</div>
                <div class="dialogue-option-text">${option.description}</div>
                <div style="margin-top: 0.75rem;">${effectsHTML}</div>
            `;

            optionDiv.addEventListener('click', function () {
                handleDialogueChoice(actorKey, index);
            });

            optionsContainer.appendChild(optionDiv);
        });
    }

    // Show overlay
    const overlay = document.getElementById('actorDialogueOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function closeActorDialogue() {
    const overlay = document.getElementById('actorDialogueOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function handleDialogueChoice(actorKey, optionIndex) {
    const dialogue = actorDialogues[actorKey];
    const option = dialogue.options[optionIndex];

    // Apply effects (simplified for now)
    let message = `You chose: "${option.title}"\n\n`;

    option.effects.forEach(effect => {
        message += `${effect.label}\n`;

        // Parse effect and update game state
        if (effect.label.includes('Political Capital')) {
            const match = effect.label.match(/([+-]\d+)/);
            if (match) {
                gameState.resources.politicalCapital += parseInt(match[1]);
            }
        }
        if (effect.label.includes('Budget')) {
            const match = effect.label.match(/([+-]\d+)/);
            if (match) {
                gameState.resources.budget += parseInt(match[1]);
            }
        }
    });

    updateResources();
    recordStatusEntry({
        category: 'Engagement',
        title: `Engagement: ${dialogue.name}`,
        summary: `Response selected: ${option.title}.`,
        effects: Array.isArray(option.effects)
            ? option.effects.map(effect => ({ label: effect.label, type: effect.type || 'neutral' }))
            : [],
        turn: gameState.turn
    });
    closeActorDialogue();
    showNotification(`Dialogue: ${dialogue.name}`, message, false);
}

// ===== CHARACTER PROFILE FUNCTIONS =====
function showCharacterProfile() {
    const overlay = document.getElementById('characterProfileOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function closeCharacterProfile() {
    const overlay = document.getElementById('characterProfileOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function () {

    // Header button listeners
    document.querySelectorAll('.header-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const text = this.textContent.trim().toLowerCase();
            if (text.includes('intel')) {
                openModal('intelModal');
            } else if (text.includes('objectives')) {
                openModal('objectivesModal');
            } else if (text.includes('menu')) {
                openModal('menuModal');
            }
        });
    });

    const statusReportBtn = document.getElementById('statusReportBtn');
    if (statusReportBtn) {
        statusReportBtn.addEventListener('click', function () {
            renderStatusReport();
            openModal('statusReportOverlay');
        });
    }

    const closeStatusReportBtn = document.getElementById('closeStatusReport');
    if (closeStatusReportBtn) {
        closeStatusReportBtn.addEventListener('click', function () {
            closeModal('statusReportOverlay');
        });
    }

    // Modal close button listeners
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', function () {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Close modals on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Scenario decision buttons
    document.querySelectorAll('.scenario-btn').forEach((btn, index) => {
        btn.addEventListener('click', function () {
            const decisions = ['military', 'diplomatic', 'humanitarian'];
            handleScenarioDecision(decisions[index]);
        });
    });

    // Territory markers
    const territoryMarkers = document.querySelectorAll('.territory-marker');
    const territoryKeys = ['mali', 'burkinaFaso', 'niger', 'chad', 'mauritania'];
    territoryMarkers.forEach((marker, index) => {
        marker.addEventListener('click', function () {
            showTerritoryDetails(territoryKeys[index]);
        });
    });



    // Action bar buttons
    const reviewBtn = document.getElementById('reviewBtn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', openTakeActionModal);
    }

    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn) {
        endTurnBtn.addEventListener('click', endTurn);
    }

    // Territory investigation
    const investigateBtn = document.getElementById('investigateBtn');
    if (investigateBtn) {
        investigateBtn.addEventListener('click', investigateTerritory);
    }

    // Zone navigation buttons
    const backToTerritoryBtn = document.getElementById('backToTerritory');
    if (backToTerritoryBtn) {
        backToTerritoryBtn.addEventListener('click', backToTerritory);
    }

    const backToZonesBtn = document.getElementById('backToZones');
    if (backToZonesBtn) {
        backToZonesBtn.addEventListener('click', backToZones);
    }

    // Resource item hover effects
    document.querySelectorAll('.resource-item, .metric-item').forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.style.transform = 'translateX(3px)';
        });
        item.addEventListener('mouseleave', function () {
            this.style.transform = '';
        });
    });

    // Intel item click to show more details
    document.querySelectorAll('.intel-item').forEach(item => {
        item.addEventListener('click', function () {
            const text = this.querySelector('.intel-text').textContent;
            showNotification('Intelligence Detail', text, this.classList.contains('urgent'));
        });
    });

    // Initialize UI
    updateMetrics();
    updateResources();
    updateActionBar();
    updateTurnCounter();

    // Intel feed minimize/maximize
    const intelMinimizeBtn = document.getElementById('intelMinimizeBtn');
    const intelFeedPanel = document.getElementById('intelFeedPanel');
    const intelFeedContent = document.getElementById('intelFeedContent');

    if (intelMinimizeBtn && intelFeedPanel) {
        intelMinimizeBtn.addEventListener('click', function () {
            intelFeedPanel.classList.toggle('minimized');
            intelFeedContent.classList.toggle('minimized');
            this.textContent = intelFeedPanel.classList.contains('minimized') ? '+' : '−';
        });
    }

    // Intel item click handlers
    const intelItems = document.querySelectorAll('.intel-item[data-intel]');
    intelItems.forEach(item => {
        item.addEventListener('click', function () {
            const intelKey = this.getAttribute('data-intel');
            showIntelReport(intelKey);
        });
    });

    // Close intel report
    const closeIntelReportBtn = document.getElementById('closeIntelReport');
    if (closeIntelReportBtn) {
        closeIntelReportBtn.addEventListener('click', closeIntelReport);
    }

    // Actor card click handlers
    const actorCards = document.querySelectorAll('.actor-card');
    actorCards.forEach(card => {
        card.addEventListener('click', function () {
            const actorKey = determineActorKey(this);
            if (actorKey) {
                showActorDetails(actorKey);
            }
        });
    });

    // Initiate Dialogue Button
    const initiateDialogueBtn = document.getElementById('initiateDialogueBtn');
    if (initiateDialogueBtn) {
        initiateDialogueBtn.addEventListener('click', function () {
            if (currentActorKey) {
                closeModal('actorModal');
                // Brief delay for smooth transition
                setTimeout(() => {
                    showActorDialogue(currentActorKey);
                }, 300);
            }
        });
    }

    // Character profile button
    const characterProfileBtn = document.getElementById('characterProfileBtn');
    if (characterProfileBtn) {
        characterProfileBtn.addEventListener('click', showCharacterProfile);
    }

    // Close character profile
    const closeCharacterProfileBtn = document.getElementById('closeCharacterProfile');
    if (closeCharacterProfileBtn) {
        closeCharacterProfileBtn.addEventListener('click', closeCharacterProfile);
    }

    const takeActionCategory = document.getElementById('takeActionCategory');
    if (takeActionCategory) {
        takeActionCategory.addEventListener('change', updateTakeActionActions);
    }

    const takeActionReviewBtn = document.getElementById('takeActionReviewBtn');
    if (takeActionReviewBtn) {
        takeActionReviewBtn.addEventListener('click', reviewTakeAction);
    }

    const takeActionConfirmBtn = document.getElementById('takeActionConfirmBtn');
    if (takeActionConfirmBtn) {
        takeActionConfirmBtn.addEventListener('click', confirmTakeAction);
    }

    const takeActionConfirmBack = document.getElementById('takeActionConfirmBack');
    if (takeActionConfirmBack) {
        takeActionConfirmBack.addEventListener('click', function () {
            closeModal('takeActionConfirmModal');
        });
    }

    // Close modals on overlay click
    document.getElementById('intelReportOverlay')?.addEventListener('click', function (e) {
        if (e.target === this) closeIntelReport();
    });

    document.getElementById('actorDialogueOverlay')?.addEventListener('click', function (e) {
        if (e.target === this) closeActorDialogue();
    });

    document.getElementById('statusReportOverlay')?.addEventListener('click', function (e) {
        if (e.target === this) closeModal('statusReportOverlay');
    });

    document.getElementById('characterProfileOverlay')?.addEventListener('click', function (e) {
        if (e.target === this) closeCharacterProfile();
    });

    // Onboarding modal controls
    const onboardingOverlay = document.getElementById('onboardingOverlay');
    const onboardingCapsule = document.getElementById('onboardingCapsule');
    const onboardingSlides = document.getElementById('onboardingSlides');
    const onboardingPrevBtn = document.getElementById('onboardingPrevBtn');
    const onboardingNextBtn = document.getElementById('onboardingNextBtn');
    const onboardingBeginBtn = document.getElementById('onboardingBeginBtn');
    const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
    const onboardingLoading = document.getElementById('onboardingLoading');
    const onboardingDots = Array.from(document.querySelectorAll('.onboarding-progress-dot'));

    let onboardingSlideIndex = 0;
    const onboardingTotalSlides = onboardingDots.length || 5;

    const setOnboardingSlide = (index) => {
        onboardingSlideIndex = Math.max(0, Math.min(index, onboardingTotalSlides - 1));
        if (onboardingSlides) {
            onboardingSlides.style.transform = `translateX(-${onboardingSlideIndex * 100}%)`;
        }
        onboardingDots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === onboardingSlideIndex);
        });
        if (onboardingPrevBtn) {
            onboardingPrevBtn.disabled = onboardingSlideIndex === 0;
        }
        if (onboardingNextBtn) {
            onboardingNextBtn.classList.toggle('is-hidden', onboardingSlideIndex === onboardingTotalSlides - 1);
        }
        if (onboardingBeginBtn) {
            onboardingBeginBtn.classList.toggle('is-hidden', onboardingSlideIndex !== onboardingTotalSlides - 1);
        }
    };

    onboardingPrevBtn?.addEventListener('click', () => setOnboardingSlide(onboardingSlideIndex - 1));
    onboardingNextBtn?.addEventListener('click', () => setOnboardingSlide(onboardingSlideIndex + 1));
    onboardingSkipBtn?.addEventListener('click', () => setOnboardingSlide(1));

    onboardingDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => setOnboardingSlide(idx));
    });

    if (onboardingBeginBtn) {
        onboardingBeginBtn.addEventListener('click', function () {
            onboardingLoading?.classList.add('active');
            setTimeout(() => {
                onboardingLoading?.classList.remove('active');
                onboardingOverlay?.classList.remove('active');
                showNotification('Mission Started', 'Welcome to the Sahel Arena, Special Envoy. Your leadership begins now.', false);
            }, 4000);
        });
    }

    if (onboardingCapsule) {
        onboardingCapsule.addEventListener('click', function () {
            this.classList.remove('show');
            this.classList.remove('visible');
            onboardingOverlay?.classList.add('active');
            setOnboardingSlide(0);
        });
    }

    // Show welcome notification after brief delay (only if onboarding closed)
    setTimeout(() => {
        if (!onboardingOverlay?.classList.contains('active')) {
            showNotification('Mission Started', 'Welcome, Special Envoy. The Sahel crisis awaits your leadership.', false);
        }
    }, 1000);

    setOnboardingSlide(0);

});

// ===== UTILITY FUNCTIONS =====
function formatNumber(num) {
    return num.toLocaleString();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

let mapIntelLayers = null;
let mapIntelVisibility = {
    militia: false,
    idp: false,
    illicit: false
};

function renderIntelOverlays() {
    if (!map || typeof L === 'undefined') return;

    const intelStyles = {
        militia: { color: '#C84B31', iconUrl: '../img/icons/rifle.png' },
        idp: { color: '#3A7BD5', iconUrl: '../img/icons/IDPs.png' },
        illicit: { color: '#E8A523', iconUrl: '../img/icons/ski_mask.png' }
    };

    if (!mapIntelLayers) {
        mapIntelLayers = {
            militia: L.layerGroup(),
            idp: L.layerGroup(),
            illicit: L.layerGroup()
        };
    } else {
        Object.values(mapIntelLayers).forEach(layer => layer.clearLayers());
    }

    const icons = {};
    Object.keys(intelStyles).forEach(type => {
        const style = intelStyles[type];
        icons[type] = L.icon({
            iconUrl: style.iconUrl,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            className: `intel-icon intel-icon-${type}`
        });
    });

    mapIntelData.forEach(item => {
        const style = intelStyles[item.type];
        if (!style) return;
        const layer = mapIntelLayers[item.type] || map;

        const halo = L.circleMarker(item.coords, {
            radius: 16,
            color: style.color,
            fillColor: style.color,
            fillOpacity: 0.15,
            weight: 1,
            opacity: 0.8
        }).addTo(layer);

        const marker = L.marker(item.coords, {
            icon: icons[item.type],
            title: item.name
        }).addTo(layer);

        if (item.details) {
            marker.bindTooltip(`<b>${item.name}</b><br>${item.details}`, {
                direction: 'top',
                offset: [0, -14],
                opacity: 0.9
            });
        }
    });

    applyIntelVisibility();
}

function applyIntelVisibility() {
    if (!map || !mapIntelLayers) return;
    Object.keys(mapIntelLayers).forEach(key => {
        const layer = mapIntelLayers[key];
        if (mapIntelVisibility[key]) {
            if (!map.hasLayer(layer)) {
                layer.addTo(map);
            }
        } else if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
}

function setupIntelToggles() {
    const toggles = document.querySelectorAll('.map-legend-toggle');
    if (!toggles.length) return;
    toggles.forEach(toggle => {
        const key = toggle.dataset.layer;
        if (!key) return;
        toggle.checked = mapIntelVisibility[key] !== false;
        toggle.addEventListener('change', () => {
            mapIntelVisibility[key] = toggle.checked;
            applyIntelVisibility();
        });
    });
}

// Function to add zones from gameState
function renderTacticalZones() {
    if (!map) return;

    const statusColors = {
        'Critical': '#C84B31',  // Red
        'Volatile': '#E85D04',  // Orange
        'Unstable': '#E8A523',  // Yellow-Orange
        'Tense': '#F4D35E',     // Yellow
        'Stable': '#2D9659'     // Green
    };

    const territoryIsoMap = {
        MLI: 'mali',
        BFA: 'burkinaFaso',
        NER: 'niger',
        TCD: 'chad',
        MRT: 'mauritania'
    };

    const applyGeoJson = (geojson) => {
        if (window.territoryGeoLayer) {
            map.removeLayer(window.territoryGeoLayer);
        }

        window.territoryGeoLayer = L.geoJSON(geojson, {
            style: (feature) => {
                const key = feature?.properties?.key || territoryIsoMap[feature?.properties?.iso_a3];
                const territory = gameState.territories[key];
                const color = statusColors[territory?.status] || '#D4AF37';
                return {
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.12,
                    opacity: 0.9
                };
            },
            onEachFeature: (feature, layer) => {
                const key = feature?.properties?.key || territoryIsoMap[feature?.properties?.iso_a3];
                const territory = gameState.territories[key];
                if (!territory) return;

                layer.on('click', () => {
                    gameState.currentTerritory = key;
                    if (typeof showTerritoryDetails === 'function') {
                        showTerritoryDetails(key);
                    }
                });

                layer.on('mouseover', () => {
                    layer.setStyle({ fillOpacity: 0.22, weight: 3 });
                });

                layer.on('mouseout', () => {
                    layer.setStyle({ fillOpacity: 0.12, weight: 2 });
                });

                layer.bindTooltip(`<b>${territory.name}</b><br>Status: ${territory.status}`, {
                    direction: 'top',
                    sticky: true,
                    className: 'country-tooltip'
                });
            }
        }).addTo(map);
    };

    if (window.sahelGeoJson) {
        applyGeoJson(window.sahelGeoJson);
        return;
    }

    fetch('sahel_countries.geojson')
        .then(response => response.json())
        .then(data => {
            window.sahelGeoJson = data;
            applyGeoJson(data);
        })
        .catch(error => {
            console.error('Failed to load territory GeoJSON:', error);
        });
}

// Initialize map variable
let map = null;

function initMap() {
    const mapElement = document.getElementById('map-container');
    if (mapElement && typeof L !== 'undefined') {
        try {
            map = L.map('map-container').setView([15.0, 5.0], 5);

            // Apply a "Dark Mode" tactical tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Render zones after map is ready
            renderTacticalZones();
            renderIntelOverlays();
            console.log('Map initialized successfully');
        } catch (e) {
            console.error('Error initializing map:', e);
        }
    } else {
        console.warn('Map container not found or Leaflet not loaded');
    }
}

// ===== TIMER FUNCTIONS =====
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerBtn = document.getElementById('timerBtn');

    if (timerDisplay) {
        timerDisplay.textContent = formatTime(gameState.timer.remainingSeconds);

        // Add warning class if less than 3 minutes remaining
        if (gameState.timer.remainingSeconds < 180) {
            timerBtn?.classList.add('warning');
        } else {
            timerBtn?.classList.remove('warning');
        }
    }
}

function startTimer() {
    if (gameState.timer.isRunning) return;

    gameState.timer.isRunning = true;
    gameState.timer.intervalId = setInterval(() => {
        if (gameState.timer.remainingSeconds > 0) {
            gameState.timer.remainingSeconds--;
            updateTimerDisplay();
        } else {
            // Timer expired
            stopTimer();
            alert('Turn time expired! Moving to next turn...');
            // TODO: Implement auto-advance to next turn
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timer.intervalId) {
        clearInterval(gameState.timer.intervalId);
        gameState.timer.intervalId = null;
    }
    gameState.timer.isRunning = false;
}

function resetTimer() {
    stopTimer();
    gameState.timer.remainingSeconds = gameState.timer.totalSeconds;
    updateTimerDisplay();
}

function toggleTimer() {
    if (gameState.timer.isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

// Ensure map initializes after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupIntelToggles();

    // Initialize timer display
    updateTimerDisplay();

    seedTurnOneOutcomes();

    // Update Act and Turn displays
    const actDisplay = document.getElementById('actDisplay');
    const turnDisplay = document.getElementById('turnDisplay');
    const actionsHeader = document.getElementById('actionsRemainingHeader');
    if (actDisplay) actDisplay.textContent = gameState.act;
    if (turnDisplay) turnDisplay.textContent = `${gameState.turn} / ${gameState.maxTurns}`;
    if (actionsHeader) actionsHeader.textContent = `${gameState.actionsRemaining} / ${gameState.maxActions}`;

    // Timer button click handler
    const timerBtn = document.getElementById('timerBtn');
    if (timerBtn) {
        timerBtn.addEventListener('click', toggleTimer);
    }
});

// Export game state for debugging
window.gameState = gameState;
