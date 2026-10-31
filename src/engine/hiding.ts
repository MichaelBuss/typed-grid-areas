import { placeAreas } from "./placement";
import { Condition, Rule, widthRank } from "./rules";

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
  /** Applies once the grid is given at least this width (from zero when absent). */
  from?: string;
  /** Applies while the grid is given less than this width (no limit when absent). */
  until?: string;
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

      // Each wider breakpoint at which another shower switches on starts a new width range.
      const lowerBounds: Array<string | undefined> = [rule.minWidth];
      for (const shower of [...showers].sort(
        (a, b) => widthRank(a.minWidth) - widthRank(b.minWidth),
      )) {
        const rank = widthRank(shower.minWidth);
        if (rank > widthRank(lowerBounds[lowerBounds.length - 1])) {
          lowerBounds.push(shower.minWidth);
        }
      }

      lowerBounds.forEach((from, boundIndex) => {
        const active = showers.filter(shower => widthRank(shower.minWidth) <= widthRank(from));
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
