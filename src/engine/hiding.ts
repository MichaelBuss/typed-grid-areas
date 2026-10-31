import { ContainerBreakpoint } from "../types";
import { placeAreas } from "./placement";
import { breakpointRank, Condition, Rule } from "./rules";

/**
 * Hides one area while a rule applies and none of the later rules that
 * would show the area applies, within a width range.
 *
 * Hiding has to beat a consumer's own `display`, so it is emitted as an
 * important declaration, and an important declaration can't be undone by a
 * later rule without also overriding the consumer. Making each hide exclusive
 * of the rules that come after it avoids needing to undo it at all.
 */
export type HideRule = {
  area: string;
  condition: Condition;
  /** Conditions of later rules that show the area; none of them may hold. */
  except: ReadonlyArray<Condition>;
  /** Applies from this breakpoint up (from zero width when absent). */
  from?: ContainerBreakpoint;
  /** Applies below this breakpoint (with no upper limit when absent). */
  until?: ContainerBreakpoint;
};

function isUnconditional({ when, unless }: Condition): boolean {
  return when.length === 0 && unless.length === 0;
}

/**
 * Works out where each area a rule leaves out must be hidden.
 */
export function toHideRules(
  areas: ReadonlyArray<string>,
  rules: ReadonlyArray<Rule>,
): Array<HideRule> {
  const placed = rules.map(rule => placeAreas(rule.arrangement.cells));
  const hideRules: Array<HideRule> = [];

  rules.forEach((rule, index) => {
    for (const area of areas) {
      // Nothing to hide if the rule places the area, or only applies when it's absent.
      if (placed[index]?.has(area) === true || rule.condition.unless.includes(area)) {
        continue;
      }

      const showers = rules.filter(
        (later, laterIndex) =>
          laterIndex > index &&
          placed[laterIndex]?.has(area) === true &&
          !later.condition.unless.includes(area),
      );

      // Each later breakpoint at which another shower switches on starts a new width range.
      const ownRank = breakpointRank(rule.breakpoint);
      const lowerBounds: Array<ContainerBreakpoint | undefined> = [rule.breakpoint];
      for (const shower of [...showers].sort(
        (a, b) => breakpointRank(a.breakpoint) - breakpointRank(b.breakpoint),
      )) {
        if (
          breakpointRank(shower.breakpoint) > ownRank &&
          !lowerBounds.includes(shower.breakpoint)
        ) {
          lowerBounds.push(shower.breakpoint);
        }
      }

      lowerBounds.forEach((from, boundIndex) => {
        const active = showers.filter(
          shower => breakpointRank(shower.breakpoint) <= breakpointRank(from),
        );
        if (active.some(shower => isUnconditional(shower.condition))) {
          return;
        }
        hideRules.push({
          area,
          condition: rule.condition,
          except: active.map(shower => shower.condition),
          from,
          until: lowerBounds[boundIndex + 1],
        });
      });
    }
  });

  return hideRules;
}
