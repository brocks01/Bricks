-- A scheduled call can carry the person's own instruction for the agent ("teach me ten English words and quiz me", "help me prepare for college"),
-- so any recurring item in the calendar can become a conversation with Wisdom, not only "have you taken it?".
alter table calendar_items add column agent_brief text check (agent_brief is null or char_length(agent_brief) <= 500);
