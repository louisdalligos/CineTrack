'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { GenreCount } from '@/types/stats';

const chartConfig = {
  count: {
    label: 'Movies',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

/**
 * Horizontal bars: genre names are variable-length labels, which read far
 * better along the axis than rotated under vertical columns.
 *
 * The list below the chart is not redundancy for its own sake — an SVG chart
 * is opaque to screen readers, so the same data is exposed as text.
 */
export function GenreChart({ genres }: { genres: GenreCount[] }) {
  return (
    <>
      <ChartContainer config={chartConfig} className="h-[180px] w-full">
        <BarChart
          accessibilityLayer
          data={genres}
          layout="vertical"
          margin={{ left: 0, right: 16 }}
        >
          <YAxis
            dataKey="genre"
            type="category"
            tickLine={false}
            axisLine={false}
            width={110}
            tickMargin={8}
            className="text-xs"
          />
          <XAxis dataKey="count" type="number" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={22} />
        </BarChart>
      </ChartContainer>

      <ul className="sr-only" data-testid="genre-chart-data">
        {genres.map((genre) => (
          <li key={genre.genre}>
            {genre.genre}: {genre.count} {genre.count === 1 ? 'movie' : 'movies'}
          </li>
        ))}
      </ul>
    </>
  );
}
