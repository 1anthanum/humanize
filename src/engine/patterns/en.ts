import type { PatternSet } from '@/types';

export const EN_PATTERNS: PatternSet = {
  filler: [
    { re: /\bIt is worth noting that\b/gi, tip: 'Filler — delete or state the point directly' },
    { re: /\bIt is important to note that\b/gi, tip: 'Filler — just state the point' },
    { re: /\bIt should be noted that\b/gi, tip: 'Filler — remove and state directly' },
    {
      re: /\bIn today'?s (?:rapidly )?(?:evolving|changing) (?:landscape|world|era)\b/gi,
      tip: 'Cliché opener — be specific about what changed and when',
    },
    { re: /\bIn (?:the )?realm of\b/gi, tip: 'Vague framing — name the specific area' },
    {
      re: /\bplays a (?:crucial|vital|key|pivotal|important) role\b/gi,
      tip: 'Vague — explain HOW it matters, with evidence',
    },
    {
      re: /\bhas gained (?:significant |increasing )?(?:traction|attention|popularity)\b/gi,
      tip: 'Vague claim — cite a specific indicator of growth',
    },
    {
      re: /\b(?:a |A )(?:wide |broad )?(?:range|variety|plethora) of\b/gi,
      tip: 'Vague quantifier — be specific: how many? which ones?',
    },
    {
      re: /\b(?:it is |it's )?(?:crucial|essential|imperative|vital) (?:to|that)\b/gi,
      tip: 'Assertive filler — explain WHY it matters instead',
    },
    {
      re: /\bserves as a (?:testament|reminder)\b/gi,
      tip: 'Cliché — state the actual evidence',
    },
    { re: /\bin this (?:context|regard|respect)\b/gi, tip: 'Often unnecessary — try removing it' },
    {
      re: /\bLet'?s delve (?:into|deeper)\b/gi,
      tip: "AI-typical opener — just start your analysis",
    },
    {
      re: /\bI hope this (?:email |message )?finds you well\b/gi,
      tip: 'Template greeting — personalize or skip',
    },
    {
      re: /\bPlease (?:do not|don'?t) hesitate to (?:reach out|contact)\b/gi,
      tip: 'Template closing — try something specific',
    },
    {
      re: /\bThank you for your (?:time and )?consideration\b/gi,
      tip: 'Template closing — be more specific about next steps',
    },
    {
      re: /\bI would (?:like to )?take this opportunity to\b/gi,
      tip: 'Wordy — just do the thing',
    },
    { re: /\bAt the end of the day\b/gi, tip: 'Cliché — state your conclusion directly' },
    {
      re: /\bnavigat(?:e|ing) (?:the )?(?:complexit(?:y|ies)|challenges|landscape)\b/gi,
      tip: 'AI-typical phrasing — describe the specific difficulty',
    },
    {
      re: /\bin conclusion\b/gi,
      tip: 'Mechanical transition — your conclusion should be clear from context',
    },
    { re: /\bto summarize\b/gi, tip: 'Mechanical — let your summary speak for itself' },
  ],

  hedge: [
    { re: /\bmay potentially\b/gi, tip: "Double hedge — pick 'may' or 'potentially', not both" },
    { re: /\bcould potentially\b/gi, tip: "Double hedge — simplify to 'could' or 'might'" },
    { re: /\bcould arguably\b/gi, tip: 'Double hedge — commit to the claim or remove it' },
    {
      re: /\bit (?:could be|might be) argued that\b/gi,
      tip: 'Weak attribution — say who argues this, or make the claim yourself',
    },
    {
      re: /\bgenerally speaking\b/gi,
      tip: "Hedge — be specific about when it applies and when it doesn't",
    },
    { re: /\bto some extent\b/gi, tip: 'Vague hedge — quantify: to what extent?' },
    { re: /\brelatively\b/gi, tip: "'relatively' needs a comparison — relative to what?" },
    { re: /\bquite\b/gi, tip: "'quite' weakens your claim — commit or quantify" },
    { re: /\bsomewhat\b/gi, tip: "'somewhat' is vague — use a number or specific qualifier" },
  ],

  connector: [
    {
      re: /\bFurthermore,?\b/g,
      tip: "Overused AI connector — try removing it; if the logic is clear, you don't need it",
    },
    {
      re: /\bMoreover,?\b/g,
      tip: 'Overused AI connector — often removable if the paragraph flows logically',
    },
    {
      re: /\bAdditionally,?\b/g,
      tip: "Overused AI connector — try 'Also' or just start the sentence",
    },
    {
      re: /\bConsequently,?\b/g,
      tip: "Consider 'So' or restructure to show causation through content",
    },
    { re: /\bNonetheless,?\b/g, tip: "'But' or 'Still' often works better" },
    { re: /\bNotwithstanding\b/gi, tip: "Overly formal — try 'Despite' or 'Even so'" },
    { re: /\bConversely,?\b/g, tip: "Consider 'But' or 'On the other hand'" },
    {
      re: /\bIn light of (?:this|these|the above)\b/gi,
      tip: 'AI-typical transition — try being direct',
    },
    { re: /\bWith (?:this|that) in mind\b/gi, tip: 'AI-typical bridge — often removable' },
    { re: /\bThat being said,?\b/gi, tip: "Filler transition — try 'But' or 'However'" },
    { re: /\bHaving said that,?\b/gi, tip: 'Filler transition — simplify' },
  ],

  template: [
    {
      re: /\bThis (?:study|paper|work|research) (?:aims to|seeks to|proposes|presents|introduces|investigates)\b/gi,
      tip: 'Standard academic template — consider a more direct opening',
    },
    {
      re: /\bThe (?:results|findings) (?:suggest|indicate|demonstrate|reveal|show) that\b/gi,
      tip: 'Template results phrasing — try leading with the actual finding',
    },
    {
      re: /\bFuture (?:work|research|studies) (?:should|could|may|might)\b/gi,
      tip: 'Template future work — be specific about what problem to tackle next',
    },
    {
      re: /\bTo (?:the best of )?our knowledge\b/gi,
      tip: "Common but risky — make sure you've done a thorough search",
    },
    {
      re: /\bhas (?:become|emerged as) (?:a |an )?(?:increasingly |growing )?(?:important|significant|popular|critical)\b/gi,
      tip: 'Vague importance claim — cite evidence or a specific trend',
    },
    { re: /\bpaves the way for\b/gi, tip: 'Cliché — describe the specific opportunity created' },
    {
      re: /\bbridge(?:s|ing)? the gap\b/gi,
      tip: 'Cliché — describe what specific problem is solved',
    },
    {
      re: /\bshed(?:s|ding)? (?:new )?light on\b/gi,
      tip: 'Cliché — state the specific insight',
    },
    {
      re: /\bopen(?:s|ing)? (?:up )?(?:new )?(?:avenues|doors|possibilities)\b/gi,
      tip: 'Vague — name the specific opportunities',
    },
    // AI code explanation patterns (ChatGPT-typical)
    {
      re: /\bIt works by (?:\w+ ?){1,3}ing\b/gi,
      tip: 'AI code-explanation template — describe the mechanism more directly',
    },
    {
      re: /\bThis (?:approach|implementation|method|function|code) (?:ensures|handles|provides|allows)\b/gi,
      tip: 'AI code-explanation template — show what happens rather than narrate',
    },
    {
      re: /\bIt is worth mentioning that\b/gi,
      tip: 'Filler — if worth mentioning, just mention it',
    },
    {
      re: /\bLet'?s (?:break (?:this|it) down|walk through|take a (?:closer )?look)\b/gi,
      tip: "AI-typical tutorial phrasing — just start explaining",
    },
    {
      re: /\bAs (?:you can|we can) see\b/gi,
      tip: 'Filler — the reader can already see; state the point',
    },
  ],

  softFiller: [
    {
      re: /\bdelve into\b/gi,
      tip: "'delve' is heavily associated with AI text — use 'examine' or 'explore'",
    },
    {
      re: /\bleverage\b/gi,
      tip: "'leverage' as a verb is AI-typical — try 'use', 'apply', or 'build on'",
    },
    {
      re: /\bfoster(?:s|ing)?\b/gi,
      tip: "'foster' is overused in AI text — try 'encourage', 'support', or be specific",
    },
    {
      re: /\bseamless(?:ly)?\b/gi,
      tip: "'seamless(ly)' is AI-typical — describe the actual experience",
    },
    {
      re: /\bholistic(?:ally)?\b/gi,
      tip: "'holistic' is vague and AI-typical — specify what you mean",
    },
    { re: /\bsynerg(?:y|ies|istic)\b/gi, tip: 'Buzzword — explain the specific interaction' },
    { re: /\bparadigm(?:s| shift)?\b/gi, tip: 'Often AI filler — name the specific change' },
    {
      re: /\btransformative\b/gi,
      tip: "'transformative' is overused — describe the actual transformation",
    },
    {
      re: /\bgroundbreaking\b/gi,
      tip: 'Hyperbolic — let the results speak or explain what\'s actually new',
    },
    {
      re: /\bcutting-edge\b/gi,
      tip: 'AI cliché — describe what makes it novel specifically',
    },
    {
      re: /\bstate-of-the-art\b/gi,
      tip: 'Overused in academic context — cite the actual SOTA result',
    },
    { re: /\boverall,?\b/gi, tip: "'Overall' often signals summary filler — try being specific" },
    {
      re: /\brobust\b/gi,
      tip: "'robust' is AI-overused — quantify or use a more precise term",
    },
    {
      re: /\bempow(?:er|ers|ering)\b/gi,
      tip: "'empower' is AI-typical — describe the specific capability gained",
    },
    { re: /\bstakeholders?\b/gi, tip: 'Vague — name the specific groups' },
    // Marketing buzzwords (common in AI-generated promotional copy)
    {
      re: /\brevolutionary\b/gi,
      tip: "'revolutionary' is AI-marketing hyperbole — describe the specific improvement",
    },
    {
      re: /\bunprecedented\b/gi,
      tip: "'unprecedented' is overused — is it truly first-of-its-kind? Cite evidence",
    },
    {
      re: /\bcomprehensive\b/gi,
      tip: "'comprehensive' is vague — list what it actually covers",
    },
    {
      re: /\binnovative\b/gi,
      tip: "'innovative' is overused — describe what's novel specifically",
    },
    {
      re: /\bstreamline(?:s|d)?\b/gi,
      tip: "'streamline' is AI-typical — describe the specific efficiency gain",
    },
    {
      re: /\bgame[- ]?changer\b/gi,
      tip: 'AI-marketing buzzword — describe the concrete impact instead',
    },
    {
      re: /\bnext[- ]?gen(?:eration)?\b/gi,
      tip: 'Marketing filler — describe the actual advancement',
    },
  ],
};
